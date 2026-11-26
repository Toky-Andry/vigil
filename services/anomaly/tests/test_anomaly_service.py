import unittest
from collections import deque

import numpy as np
import anomaly_service

from anomaly_service import (
    IF_MIN_POINTS,
    ServerState,
    feature_vector,
    fit_iforest,
    update_ewma,
)


def metric_row(index: int, cpu: float = 20.0) -> dict:
    return {
        "server_id": "00000000-0000-0000-0000-000000000001",
        "ts": f"2026-01-01T00:{index // 60:02d}:{index % 60:02d}+00:00",
        "cpu_pct": cpu,
        "ram_pct": 45.0,
        "disk_pct": 30.0,
        "load1": 0.2,
        "net_rx_bps": 1000,
        "net_tx_bps": 2000,
    }


class DetectorTests(unittest.TestCase):
    def test_ewma_tracks_baseline(self):
        state = ServerState()
        for index in range(40):
            update_ewma(state, metric_row(index))
        self.assertEqual(state.warmup, 40)
        self.assertAlmostEqual(state.ewma["cpu_pct"], 20.0)
        self.assertAlmostEqual(state.deviation["cpu_pct"], 0.0)

    def test_feature_vector_compresses_network_counters(self):
        vector = feature_vector(metric_row(1))
        self.assertEqual(vector.shape, (6,))
        self.assertTrue(np.isfinite(vector).all())
        self.assertLess(vector[-1], 10)

    def test_isolation_forest_fits_after_minimum_history(self):
        baseline = [metric_row(i, 20 + i % 3) for i in range(IF_MIN_POINTS)]
        for index, row in enumerate(baseline):
            row["ram_pct"] = 40 + index % 10
            row["disk_pct"] = 25 + index % 7
            row["load1"] = 0.1 + (index % 5) * 0.1
            row["net_rx_bps"] = 500 + (index % 40) * 20
            row["net_tx_bps"] = 300 + (index % 30) * 15
        state = ServerState(
            rows=deque(baseline, maxlen=2000),
            training_rows=deque(baseline, maxlen=2000),
        )
        fit_iforest(state)
        self.assertIsNotNone(state.model)
        outlier = metric_row(300, 99)
        outlier.update(ram_pct=99, disk_pct=99, load1=50, net_rx_bps=1_000_000_000, net_tx_bps=1_000_000_000)
        prediction = state.model.predict(feature_vector(outlier).reshape(1, -1))
        self.assertEqual(int(prediction[0]), -1)


class FakeResponse:
    def raise_for_status(self):
        pass

    def json(self):
        return {"ok": True}


class FakeClient:
    def __init__(self):
        self.calls = []

    async def post(self, url, json):
        self.calls.append((url.rsplit("/", 1)[-1], json))
        return FakeResponse()


class StreamingDetectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_ewma_stays_open_during_sustained_spike_then_resolves(self):
        server_id = "00000000-0000-0000-0000-000000000001"
        baseline = [metric_row(i) for i in range(120)]
        state = ServerState(
            rows=deque(baseline, maxlen=2000),
            training_rows=deque(baseline, maxlen=2000),
        )
        for row in baseline:
            update_ewma(state, row)
        fit_iforest(state)
        anomaly_service.states.clear()
        anomaly_service.states[server_id] = state
        client = FakeClient()

        for index in range(120, 126):
            await anomaly_service.process_row(client, metric_row(index, 95), detect=True)
        opened = [payload for path, payload in client.calls if path == "anomalies" and payload["method"] == "ewma"]
        resolved_during_spike = [payload for path, payload in client.calls if path == "resolve" and payload["method"] == "ewma" and payload["metric"] == "cpu_pct"]
        self.assertEqual(len(opened), 1)
        self.assertEqual(resolved_during_spike, [])

        for index in range(126, 130):
            await anomaly_service.process_row(client, metric_row(index, 20), detect=True)
        resolved = [payload for path, payload in client.calls if path == "resolve" and payload["method"] == "ewma" and payload["metric"] == "cpu_pct"]
        self.assertEqual(len(resolved), 1)


if __name__ == "__main__":
    unittest.main()
