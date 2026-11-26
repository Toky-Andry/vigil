"""Record controlled experiments in Vigil's database through the internal API."""

from __future__ import annotations

import argparse
import json
import os
import sys

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Enregistrer une expérience de panne Vigil")
    parser.add_argument("action", choices=("start", "end"))
    parser.add_argument("--server", help="UUID du serveur (pour start)")
    parser.add_argument("--scenario", choices=("cpu", "memory", "disk", "agent_offline", "other"))
    parser.add_argument("--id", help="UUID de l'expérience (pour end)")
    args = parser.parse_args()

    api = os.getenv("VIGIL_API_URL", "http://127.0.0.1:4000").rstrip("/")
    token = os.getenv("VIGIL_INTERNAL_TOKEN", "")
    if len(token) < 32:
        parser.error("VIGIL_INTERNAL_TOKEN doit contenir au moins 32 caractères")
    headers = {"x-vigil-internal-token": token}

    if args.action == "start":
        if not args.server or not args.scenario:
            parser.error("start demande --server et --scenario")
        response = httpx.post(
            f"{api}/internal/v1/experiments",
            headers=headers,
            json={"server_id": args.server, "scenario": args.scenario},
            timeout=10,
        )
    else:
        if not args.id:
            parser.error("end demande --id")
        response = httpx.post(
            f"{api}/internal/v1/experiments/{args.id}/end", headers=headers, timeout=10
        )
    if response.is_error:
        print(f"Erreur API {response.status_code}: {response.text}", file=sys.stderr)
        raise SystemExit(1)
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
