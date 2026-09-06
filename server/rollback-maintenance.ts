import { createRollbackMaintenanceApp } from "./rollback-maintenance-app";

async function start() {
  if (
    process.env.UPLOAD_MUTATIONS_FROZEN !== "true" ||
    !process.env.CLIENT_STACK_ID ||
    !process.env.DATABASE_URL ||
    !process.env.SESSION_SECRET
  ) {
    throw new Error("Explicit frozen recovery configuration required");
  }
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.searchParams.has("options"))
    throw new Error("Recovery database URL options are not allowed");
  const privateDatabase =
    databaseUrl.hostname.endsWith(".railway.internal") ||
    ["127.0.0.1", "localhost", "[::1]"].includes(databaseUrl.hostname);
  if (
    !privateDatabase &&
    !["verify-full", "verify-ca"].includes(databaseUrl.searchParams.get("sslmode") || "")
  ) {
    throw new Error("Verified database TLS required outside private recovery network");
  }
  databaseUrl.searchParams.set(
    "options",
    "-c default_transaction_read_only=on -c statement_timeout=10000",
  );
  databaseUrl.searchParams.set("connect_timeout", "5");
  process.env.DATABASE_URL = databaseUrl.toString();
  // Lazy imports keep configuration rejection ahead of database/storage initialization.
  const { pool } = await import("./db");
  const { downloadFile } = await import("./services/r2.service");
  pool.on("error", () => console.error("Recovery database connection error"));
  const app = createRollbackMaintenanceApp({
    ready: async () => {
      const result = await pool.query({
        text: "SELECT current_setting('transaction_read_only') AS read_only",
      });
      if (result.rows[0]?.read_only !== "on")
        throw new Error("Read-only database session required");
    },
    download: downloadFile,
  });
  const server = app.listen(Number(process.env.PORT || 5000), "0.0.0.0");
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 30_000);
    deadline.unref();
    server.close(() => {
      void pool.end().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    });
    server.closeIdleConnections();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

void start().catch(() => {
  console.error("Recovery maintenance startup failed");
  process.exit(1);
});
