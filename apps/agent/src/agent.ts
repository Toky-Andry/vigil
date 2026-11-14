import os from "node:os";
import si from "systeminformation";

const API_URL = (process.env.VIGIL_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const API_KEY = process.env.VIGIL_API_KEY;
const INTERVAL_S = Math.max(2, Number(process.env.VIGIL_INTERVAL_S ?? 10));
const DISK_MOUNT =
  process.env.VIGIL_DISK_MOUNT ?? (process.platform === "win32" ? "C:" : "/");

if (!API_KEY) {
  console.error("VIGIL_API_KEY manquante (voir .env.example)");
  process.exit(1);
}

type Sample = {
  cpu_pct: number;
  ram_pct: number;
  disk_pct: number;
  load1?: number;
  net_rx_bps: number;
  net_tx_bps: number;
};

const clampPct = (v: number) => Math.min(100, Math.max(0, Math.round(v * 10) / 10));

let netIface: string | null = null;

async function collect(): Promise<Sample> {
  if (!netIface) netIface = await si.networkInterfaceDefault();

  const [load, mem, disks, nets] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(netIface || "*"),
  ]);

  const disk = disks.find((d) => d.mount === DISK_MOUNT) ?? disks[0];
  const net = nets[0];
  const sample: Sample = {
    cpu_pct: clampPct(load.currentLoad),
    ram_pct: clampPct(((mem.total - mem.available) / mem.total) * 100),
    disk_pct: clampPct(disk?.use ?? 0),
    // octets/s -> bits/s (colonnes net_*_bps)
    net_rx_bps: Math.max(0, Math.round((net?.rx_sec ?? 0) * 8)),
    net_tx_bps: Math.max(0, Math.round((net?.tx_sec ?? 0) * 8)),
  };
  // loadavg n'existe pas sous Windows (renvoie 0)
  if (process.platform !== "win32") sample.load1 = Math.round(os.loadavg()[0] * 100) / 100;
  return sample;
}

async function send(sample: Sample): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY! },
    body: JSON.stringify(sample),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
}

let timer: NodeJS.Timeout | undefined;
let stopping = false;

async function tick() {
  try {
    const sample = await collect();
    await send(sample);
    console.log(
      `${new Date().toISOString()} ok cpu=${sample.cpu_pct}% ram=${sample.ram_pct}% disk=${sample.disk_pct}%`,
    );
  } catch (err) {
    console.error(`${new Date().toISOString()} erreur: ${(err as Error).message}`);
  } finally {
    if (!stopping) timer = setTimeout(tick, INTERVAL_S * 1000);
  }
}

const stop = () => {
  stopping = true;
  if (timer) clearTimeout(timer);
  console.log("Agent arrêté.");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log(`Vigil agent -> ${API_URL} toutes les ${INTERVAL_S}s (disque ${DISK_MOUNT})`);
void tick();