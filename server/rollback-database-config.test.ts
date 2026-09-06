import { createServer, type Socket } from "node:net";
import { describe, expect, it } from "vitest";
import pg from "pg";
import { rollbackDatabaseConfig } from "./rollback-database-config";

describe("recovery database configuration", () => {
  it("times out a real stalled local PostgreSQL handshake", async () => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => sockets.add(socket));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No fixture port");
    const client = new pg.Client(
      rollbackDatabaseConfig(`postgres://user:pass@127.0.0.1:${address.port}/db?sslmode=disable`),
    );
    try {
      const started = Date.now();
      await expect(client.connect()).rejects.toThrow(/timeout/i);
      expect(Date.now() - started).toBeLessThan(8000);
    } finally {
      await client.end();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 12000);

  it.each([
    "postgres://user:pass@192.0.2.1/db?sslmode=verify-full",
    "postgres://user:pass@external.example/db?sslmode=verify-ca",
    "postgres://user:pass@127.0.0.1/db?host=external.example&sslmode=disable",
    "postgres://user:pass@external.example/db?sslmode=verify-full&sslmode=disable",
    "postgres://user:pass@external.example/db?sslmode=disable",
    "postgres://user:pass@127.0.0.1/db?sslmode=disable&options=-c%20default_transaction_read_only=off",
  ])("rejects overriding or insecure configuration", (url) => {
    expect(() => rollbackDatabaseConfig(url)).toThrow();
  });
  it("passes actual driver timeout and read-only options without URL overrides", () => {
    const config = rollbackDatabaseConfig("postgres://user:pass@127.0.0.1/db?sslmode=disable");
    const client = new pg.Client(config);
    expect(client).toHaveProperty("_connectionTimeoutMillis", 5000);
    expect(client).toHaveProperty(
      "connectionParameters.options",
      "-c default_transaction_read_only=on -c statement_timeout=10000",
    );
    expect(client).toHaveProperty("connectionParameters.host", "127.0.0.1");
  });
});
