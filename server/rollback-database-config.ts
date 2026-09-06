import { isIP } from "node:net";
import type { PoolConfig } from "pg";

export function rollbackDatabaseConfig(value: string): PoolConfig {
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Invalid database protocol");
  if (
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
    url.searchParams.getAll("sslmode").length > 1
  ) {
    throw new Error("Ambiguous recovery database configuration");
  }
  const privateDatabase =
    url.hostname.endsWith(".railway.internal") ||
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (!privateDatabase && isIP(url.hostname.replace(/^\[|\]$/g, "")))
    throw new Error("External recovery database requires a DNS hostname");
  const sslmode = url.searchParams.get("sslmode");
  if (!sslmode || (!privateDatabase && sslmode !== "verify-full")) {
    throw new Error("Explicit verified database TLS required outside private recovery network");
  }
  return {
    connectionString: url.toString(),
    connectionTimeoutMillis: 5000,
    options: "-c default_transaction_read_only=on -c statement_timeout=10000",
  };
}
