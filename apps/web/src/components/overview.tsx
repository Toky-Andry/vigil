"use client";

import { useEffect, useState } from "react";
import { API_URL, fetchServers, type ServerSummary } from "@/lib/api";

const REFRESH_MS = 5000;

function Meter({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const color = v >= 90 ? "bg-danger" : v >= 75 ? "bg-warning" : "bg-primary-strong";
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{label}</span>
        <span className="text-text">{value === null ? "--" : `${value.toFixed(1)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-border">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: ServerSummary }) {
  const online = server.status === "online";
  const m = server.latest;
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold">{server.name}</h2>
          <p className="font-mono text-xs text-muted">
            {[server.ip, server.os].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <span
          className={`rounded px-2 py-0.5 font-mono text-xs ${
            online ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
          }`}
        >
          {online ? "Online" : "Offline"}
        </span>
      </header>
      <div className="mt-4 space-y-3">
        <Meter label="CPU" value={m?.cpu_pct ?? null} />
        <Meter label="RAM" value={m?.ram_pct ?? null} />
        <Meter label="DISK" value={m?.disk_pct ?? null} />
      </div>
    </article>
  );
}

export function Overview() {
  const [servers, setServers] = useState<ServerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const data = await fetchServers(controller.signal);
        setServers(data);
        setError(null);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    }

    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  if (error && !servers) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
        API injoignable ({error}). Vérifie qu&apos;elle tourne sur {API_URL}.
      </div>
    );
  }
  if (!servers) return <p className="text-sm text-muted">Chargement…</p>;
  if (servers.length === 0) {
    return <p className="text-sm text-muted">Aucun serveur enregistré.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {servers.map((s) => (
        <ServerCard key={s.id} server={s} />
      ))}
    </div>
  );
}