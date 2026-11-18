import { evaluateHeartbeat } from "./heartbeat.js";
import { loadRules } from "./rules.js";
import { evaluateStatic } from "./static.js";

const EVAL_INTERVAL_MS = 10_000;

type Logger = { error: (err: unknown, msg: string) => void };

export async function runAlertCycle(): Promise<void> {
  for (const rule of await loadRules()) await evaluateStatic(rule);
  await evaluateHeartbeat();
}

export function startAlertEngine(log: Logger): () => void {
  let running = false; // évite deux cycles qui se chevauchent
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runAlertCycle();
    } catch (err) {
      log.error(err, "alert evaluation failed");
    } finally {
      running = false;
    }
  }, EVAL_INTERVAL_MS);
  return () => clearInterval(timer);
}
