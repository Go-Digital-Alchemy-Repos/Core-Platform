interface RouteStat {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

interface MetricsStore {
  requests: Map<string, RouteStat>;
  errors: Map<number, number>;
  dbQueries: { count: number; totalMs: number; minMs: number; maxMs: number };
  emailOutcomes: { success: number; failure: number };
  startedAt: number;
}

const store: MetricsStore = {
  requests: new Map(),
  errors: new Map(),
  dbQueries: { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 },
  emailOutcomes: { success: 0, failure: 0 },
  startedAt: Date.now(),
};

function routeKey(method: string, path: string): string {
  const normalized = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");
  return `${method} ${normalized}`;
}

export function recordRequest(method: string, path: string, durationMs: number, statusCode: number) {
  const key = routeKey(method, path);
  const existing = store.requests.get(key) || { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
  existing.count++;
  existing.totalMs += durationMs;
  existing.minMs = Math.min(existing.minMs, durationMs);
  existing.maxMs = Math.max(existing.maxMs, durationMs);
  store.requests.set(key, existing);

  if (statusCode >= 400) {
    store.errors.set(statusCode, (store.errors.get(statusCode) || 0) + 1);
  }
}

export function recordDbQuery(durationMs: number) {
  store.dbQueries.count++;
  store.dbQueries.totalMs += durationMs;
  store.dbQueries.minMs = Math.min(store.dbQueries.minMs, durationMs);
  store.dbQueries.maxMs = Math.max(store.dbQueries.maxMs, durationMs);
}

export function recordEmailOutcome(success: boolean) {
  if (success) {
    store.emailOutcomes.success++;
  } else {
    store.emailOutcomes.failure++;
  }
}

export function getMetricsSnapshot() {
  const routes: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number }> = {};
  store.requests.forEach((stat, key) => {
    routes[key] = {
      count: stat.count,
      avgMs: Math.round(stat.totalMs / stat.count),
      minMs: stat.minMs === Infinity ? 0 : stat.minMs,
      maxMs: stat.maxMs,
    };
  });

  const errors: Record<string, number> = {};
  store.errors.forEach((count, code) => {
    errors[String(code)] = count;
  });

  return {
    uptimeSeconds: Math.floor((Date.now() - store.startedAt) / 1000),
    requests: routes,
    errors,
    dbQueries: {
      count: store.dbQueries.count,
      avgMs: store.dbQueries.count > 0 ? Math.round(store.dbQueries.totalMs / store.dbQueries.count) : 0,
      minMs: store.dbQueries.minMs === Infinity ? 0 : store.dbQueries.minMs,
      maxMs: store.dbQueries.maxMs,
    },
    email: { ...store.emailOutcomes },
  };
}
