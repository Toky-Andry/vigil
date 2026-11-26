from __future__ import annotations

import asyncio
import logging
import os
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import numpy as np
from sklearn.ensemble import IsolationForest

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("vigil-anomaly")

API_URL = os.getenv("VIGIL_API_URL", "http://127.0.0.1:4000").rstrip("/")
TOKEN = os.getenv("VIGIL_INTERNAL_TOKEN", "")
POLL_SECONDS = max(2, int(os.getenv("VIGIL_POLL_SECONDS", "10")))
HISTORY_DAYS = max(1, int(os.getenv("VIGIL_HISTORY_DAYS", "7")))
WARMUP_POINTS = max(10, int(os.getenv("VIGIL_WARMUP_POINTS", "30")))
EWMA_ALPHA = min(0.9, max(0.02, float(os.getenv("VIGIL_EWMA_ALPHA", "0.2"))))
EWMA_MIN_DELTA = max(1.0, float(os.getenv("VIGIL_EWMA_MIN_DELTA", "12")))
IF_MIN_POINTS = max(50, int(os.getenv("VIGIL_IF_MIN_POINTS", "100")))
IF_CONTAMINATION = min(0.1, max(0.001, float(os.getenv("VIGIL_IF_CONTAMINATION", "0.01"))))
METRICS = ("cpu_pct", "ram_pct", "disk_pct")
FEATURES = ("cpu_pct", "ram_pct", "disk_pct", "load1", "net_rx_bps", "net_tx_bps")


@dataclass
class ServerState:
    rows: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=2000))
    training_rows: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=2000))
    ewma: dict[str, float] = field(default_factory=dict)
    deviation: dict[str, float] = field(default_factory=dict)
    warmup: int = 0
    ewma_bad: dict[str, int] = field(default_factory=dict)
    ewma_good: dict[str, int] = field(default_factory=dict)
    ewma_active: set[str] = field(default_factory=set)
    iforest_bad: int = 0
    iforest_good: int = 0
    iforest_active: bool = False
    model: IsolationForest | None = None
    since_fit: int = 0
    last_ts: str | None = None


states: dict[str, ServerState] = {}


def feature_vector(row: dict[str, Any]) -> np.ndarray:
    # Normalize network counters so that they do not dominate the tree splits.
    return np.array(
        [
            float(row.get("cpu_pct") or 0),
            float(row.get("ram_pct") or 0),
            float(row.get("disk_pct") or 0),
            float(row.get("load1") or 0),
            np.log1p(max(0, float(row.get("net_rx_bps") or 0))),
            np.log1p(max(0, float(row.get("net_tx_bps") or 0))),
        ],
        dtype=float,
    )


def fit_iforest(state: ServerState) -> None:
    if len(state.training_rows) < IF_MIN_POINTS:
        return
    data = np.vstack([feature_vector(row) for row in state.training_rows])
    model = IsolationForest(
        n_estimators=150,
        contamination=IF_CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(data)
    state.model = model
    state.since_fit = 0
    log.info("Isolation Forest prêt (%d mesures normales)", len(state.training_rows))


def update_ewma(
    state: ServerState, row: dict[str, Any], frozen_metrics: set[str] | None = None
) -> None:
    frozen_metrics = frozen_metrics or set()
    state.warmup += 1
    for metric in METRICS:
        value = float(row.get(metric) or 0)
        if metric in frozen_metrics:
            continue
        if metric not in state.ewma:
            state.ewma[metric] = value
            state.deviation[metric] = 0.0
            continue
        residual = abs(value - state.ewma[metric])
        state.deviation[metric] = (1 - EWMA_ALPHA) * state.deviation[metric] + EWMA_ALPHA * residual
        state.ewma[metric] = (1 - EWMA_ALPHA) * state.ewma[metric] + EWMA_ALPHA * value


async def post_json(client: httpx.AsyncClient, path: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = await client.post(f"{API_URL}/internal/v1/{path}", json=payload)
    response.raise_for_status()
    return response.json()


async def process_row(client: httpx.AsyncClient, row: dict[str, Any], detect: bool) -> None:
    server_id = row["server_id"]
    state = states.setdefault(server_id, ServerState())

    row_anomalous = False
    frozen_metrics: set[str] = set()
    if detect and state.warmup >= WARMUP_POINTS:
        for metric in METRICS:
            value = float(row.get(metric) or 0)
            baseline = state.ewma.get(metric, value)
            floor = max(EWMA_MIN_DELTA, 4 * state.deviation.get(metric, 0.0))
            anomalous = abs(value - baseline) > floor
            if anomalous:
                row_anomalous = True
                frozen_metrics.add(metric)
            state.ewma_bad[metric] = state.ewma_bad.get(metric, 0) + 1 if anomalous else 0
            state.ewma_good[metric] = 0 if anomalous else state.ewma_good.get(metric, 0) + 1
            if state.ewma_bad[metric] == 1 and metric not in state.ewma_active:
                await post_json(
                    client,
                    "anomalies",
                    {
                        "server_id": server_id,
                        "method": "ewma",
                        "metric": metric,
                        "severity": "warning",
                        "message": (
                            f"EWMA : {metric}={value:.1f}, référence "
                            f"{baseline:.1f} (écart {abs(value - baseline):.1f})"
                        ),
                    },
                )
                state.ewma_active.add(metric)
            if state.ewma_good[metric] == 3 and metric in state.ewma_active:
                await post_json(client, "anomalies/resolve", {
                    "server_id": server_id, "method": "ewma", "metric": metric,
                })
                state.ewma_active.discard(metric)

        if state.model is not None:
            anomalous = int(state.model.predict(feature_vector(row).reshape(1, -1))[0]) == -1
            row_anomalous = row_anomalous or anomalous
            state.iforest_bad = state.iforest_bad + 1 if anomalous else 0
            state.iforest_good = 0 if anomalous else state.iforest_good + 1
            if state.iforest_bad == 1 and not state.iforest_active:
                await post_json(client, "anomalies", {
                    "server_id": server_id,
                    "method": "iforest",
                    "metric": "system",
                    "severity": "warning",
                    "message": "Isolation Forest : combinaison de métriques inhabituelle détectée",
                })
                state.iforest_active = True
            if state.iforest_good == 5 and state.iforest_active:
                await post_json(client, "anomalies/resolve", {
                    "server_id": server_id, "method": "iforest", "metric": "system",
                })
                state.iforest_active = False

    update_ewma(state, row, frozen_metrics if detect else None)
    state.rows.append(row)
    is_training_row = not detect or not row_anomalous
    if is_training_row:
        state.training_rows.append(row)
    state.last_ts = row["ts"]
    if is_training_row:
        state.since_fit += 1
    if detect and (state.model is None or state.since_fit >= 30):
        fit_iforest(state)


async def run() -> None:
    if len(TOKEN) < 32:
        raise RuntimeError("VIGIL_INTERNAL_TOKEN doit contenir au moins 32 caractères")
    headers = {"x-vigil-internal-token": TOKEN}
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(headers=headers, timeout=timeout) as client:
        # Use a bounded recent history for warm-up; historical anomalies are not replayed.
        start = datetime.now(timezone.utc) - timedelta(days=HISTORY_DAYS)
        response = await client.get(
            f"{API_URL}/internal/v1/metrics", params={"since": start.isoformat()}
        )
        response.raise_for_status()
        for row in response.json():
            await process_row(client, row, detect=False)
        for state in states.values():
            fit_iforest(state)
        log.info("Historique chargé pour %d serveur(s)", len(states))

        watermark = max((s.last_ts for s in states.values() if s.last_ts), default=start.isoformat())
        while True:
            try:
                response = await client.get(
                    f"{API_URL}/internal/v1/metrics",
                    params={"since": (datetime.fromisoformat(watermark) - timedelta(seconds=30)).isoformat()},
                )
                response.raise_for_status()
                rows = response.json()
                rows.sort(key=lambda item: (item["ts"], item["server_id"]))
                for row in rows:
                    previous = states.get(row["server_id"])
                    if previous and previous.last_ts and row["ts"] <= previous.last_ts:
                        continue
                    await process_row(client, row, detect=True)
                    watermark = max(watermark, row["ts"])
                await asyncio.sleep(POLL_SECONDS)
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Cycle de détection échoué; nouvel essai dans %ss", POLL_SECONDS)
                await asyncio.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        log.info("Arrêt demandé")
