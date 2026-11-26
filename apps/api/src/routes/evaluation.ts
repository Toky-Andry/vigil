import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

const METHODS = ["static", "ewma", "iforest"] as const;
type Method = (typeof METHODS)[number];
type ExperimentRow = {
  id: string;
  scenario: string;
  injected_at: Date | string;
  ended_at: Date | string;
};
type DetectionRow = {
  method: Method;
  detected_at: Date | string;
};

function millis(value: Date | string): number {
  return new Date(value).getTime();
}

export async function evaluationRoutes(app: FastifyInstance) {
  app.get("/evaluations/summary", async () => {
    const [experimentResult, incidentResult] = await Promise.all([
      pool.query<ExperimentRow>(
        `SELECT id, scenario, injected_at, ended_at
         FROM experiments WHERE ended_at IS NOT NULL ORDER BY injected_at`,
      ),
      pool.query<DetectionRow>(
        `SELECT method, detected_at FROM incidents
         WHERE method IN ('static', 'ewma', 'iforest') ORDER BY detected_at`,
      ),
    ]);

    const experiments = experimentResult.rows;
    if (experiments.length === 0) {
      return {
        experiment_count: 0,
        period: null,
        methods: Object.fromEntries(METHODS.map((method) => [method, {
          detections_in_windows: 0,
          detected_experiments: 0,
          recall: null,
          event_precision: null,
          false_alerts_per_day: null,
          mean_detection_delay_s: null,
        }])),
        scenarios: [],
      };
    }

    const windows = experiments.map((experiment) => ({
      scenario: experiment.scenario,
      start: millis(experiment.injected_at),
      end: millis(experiment.ended_at),
    }));
    const periodStart = Math.min(...windows.map((window) => window.start));
    const periodEnd = Math.max(...windows.map((window) => window.end));
    const periodDays = Math.max((periodEnd - periodStart) / 86_400_000, 1 / 1440);
    const matches = Object.fromEntries(METHODS.map((method) => [method, {
      trueEvents: 0,
      falseEvents: 0,
      detectedExperiments: new Set<number>(),
      delays: new Map<number, number>(),
    }])) as Record<Method, {
      trueEvents: number;
      falseEvents: number;
      detectedExperiments: Set<number>;
      delays: Map<number, number>;
    }>;

    for (const incident of incidentResult.rows) {
      const detectedAt = millis(incident.detected_at);
      if (detectedAt < periodStart || detectedAt > periodEnd) continue;
      const inside = windows
        .map((window, index) => ({ window, index }))
        .filter(({ window }) => detectedAt >= window.start && detectedAt <= window.end)
        .sort((a, b) =>
          Math.abs(detectedAt - a.window.start) - Math.abs(detectedAt - b.window.start),
        )[0];
      if (!inside) {
        matches[incident.method].falseEvents += 1;
        continue;
      }

      const methodMatches = matches[incident.method];
      methodMatches.trueEvents += 1;
      methodMatches.detectedExperiments.add(inside.index);
      const delay = (detectedAt - inside.window.start) / 1000;
      const previous = methodMatches.delays.get(inside.index);
      if (previous === undefined || delay < previous) methodMatches.delays.set(inside.index, delay);
    }

    const methods = Object.fromEntries(METHODS.map((method) => {
      const value = matches[method];
      const totalEvents = value.trueEvents + value.falseEvents;
      const delays = [...value.delays.values()];
      return [method, {
        detections_in_windows: value.trueEvents,
        detected_experiments: value.detectedExperiments.size,
        recall: value.detectedExperiments.size / experiments.length,
        event_precision: totalEvents === 0 ? 0 : value.trueEvents / totalEvents,
        false_alerts_per_day: value.falseEvents / periodDays,
        mean_detection_delay_s: delays.length
          ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length
          : null,
      }];
    }));

    const scenarios = [...new Set(windows.map((window) => window.scenario))].map((scenario) => {
      const indices = windows
        .map((window, index) => ({ window, index }))
        .filter(({ window }) => window.scenario === scenario)
        .map(({ index }) => index);
      return {
        scenario,
        experiment_count: indices.length,
        methods: Object.fromEntries(METHODS.map((method) => [
          method,
          indices.filter((index) => matches[method].detectedExperiments.has(index)).length,
        ])),
      };
    });

    return {
      experiment_count: experiments.length,
      period: {
        from: new Date(periodStart).toISOString(),
        to: new Date(periodEnd).toISOString(),
        days: periodDays,
      },
      methods,
      scenarios,
    };
  });
}
