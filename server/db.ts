import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { recordDbQuery } from "./utils/metrics";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isProduction && !process.env.DATABASE_URL.includes("sslmode=")
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

const origPoolQuery = Pool.prototype.query;
Pool.prototype.query = function patchedQuery(this: pg.Pool, ...args: unknown[]) {
  const start = Date.now();
  const result = origPoolQuery.apply(this, args as Parameters<typeof origPoolQuery>);
  if (result != null && typeof result === "object" && "then" in result) {
    (result as Promise<unknown>).then(
      () => recordDbQuery(Date.now() - start),
      () => recordDbQuery(Date.now() - start),
    );
  }
  return result;
} as typeof origPoolQuery;

export const db = drizzle(pool, { schema });
