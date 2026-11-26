"""Compute event-based metrics for EWMA and Isolation Forest experiments."""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timezone

import httpx


def dt(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def in_window(detected: datetime, experiment: dict) -> bool:
    start = dt(experiment["injected_at"])
    end = dt(experiment["ended_at"])
    return start <= detected <= end


def main() -> None:
    parser = argparse.ArgumentParser(description="Évaluer les méthodes de détection Vigil")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()
    token = os.getenv("VIGIL_INTERNAL_TOKEN", "")
    if len(token) < 32:
        parser.error("VIGIL_INTERNAL_TOKEN doit contenir au moins 32 caractères")
    api = os.getenv("VIGIL_API_URL", "http://127.0.0.1:4000").rstrip("/")
    response = httpx.get(
        f"{api}/internal/v1/evaluation-data",
        headers={"x-vigil-internal-token": token}, timeout=20,
    )
    response.raise_for_status()
    data = response.json()
    experiments = [e for e in data["experiments"] if e["ended_at"]]
    incidents = data["incidents"]
    if not experiments:
        parser.error("Aucune expérience terminée n'est enregistrée")

    start = min(dt(e["injected_at"]) for e in experiments)
    end = max(dt(e["ended_at"]) for e in experiments)
    observed_days = max((end - start).total_seconds() / 86400, 1 / 1440)
    result = {}
    for method in ("ewma", "iforest"):
        method_events = [i for i in incidents if i["method"] == method]
        matched: dict[int, list[dict]] = defaultdict(list)
        false_events = []
        for incident in method_events:
            detected = dt(incident["detected_at"])
            matches = [index for index, exp in enumerate(experiments) if in_window(detected, exp)]
            if matches:
                # Attribute an event to the closest injection when windows overlap.
                index = min(matches, key=lambda n: abs((detected - dt(experiments[n]["injected_at"])).total_seconds()))
                matched[index].append(incident)
            elif start <= detected <= end:
                false_events.append(incident)
        detected_experiments = len(matched)
        true_events = sum(len(events) for events in matched.values())
        delays = [
            (dt(events[0]["detected_at"]) - dt(experiments[index]["injected_at"])).total_seconds()
            for index, events in matched.items()
        ]
        result[method] = {
            "experiments": len(experiments),
            "detected_experiments": detected_experiments,
            "recall": detected_experiments / len(experiments),
            "incidents_in_windows": true_events,
            "all_incidents_in_period": true_events + len(false_events),
            "event_precision": true_events / (true_events + len(false_events)) if true_events + len(false_events) else 0,
            "false_alerts_per_day": len(false_events) / observed_days,
            "mean_detection_delay_s": sum(delays) / len(delays) if delays else None,
            "observed_days": observed_days,
        }

    if args.format == "json":
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"Période observée : {observed_days:.2f} jour(s), {len(experiments)} expérience(s) terminée(s)")
        print("Méthode  Rappel  Précision événement  Fausses alertes/jour  Délai moyen")
        for method, values in result.items():
            delay = "n/a" if values["mean_detection_delay_s"] is None else f"{values['mean_detection_delay_s']:.1f} s"
            print(
                f"{method:<8} {values['recall']:.1%}   {values['event_precision']:.1%}"
                f"                  {values['false_alerts_per_day']:.2f}                 {delay}"
            )


if __name__ == "__main__":
    main()
