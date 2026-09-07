// Run only against a disposable local database after migrations:
// DATABASE_URL=... npx tsx server/tests/standalone-locations.integration.ts
import assert from "node:assert/strict";
import express from "express";
import { errorHandler } from "../middleware/error-handler";
import { pool } from "../db";
import router from "../routes/admin/therapists.routes";
import { storage } from "../storage";

const host = new URL(process.env.DATABASE_URL!).hostname;
assert.ok(["localhost", "127.0.0.1"].includes(host), "Use a disposable local database");
await pool.query(
  "INSERT INTO system_settings(key,value,category) VALUES ('directory_mode','store_locator','directory_settings') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, category=EXCLUDED.category",
);
const countUsers = async () =>
  Number((await pool.query("SELECT count(*) FROM users")).rows[0].count);
const before = await countUsers();
const app = express();
app.use(express.json());
app.use("/profiles", router);
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", resolve));
const address = server.address() as { port: number };
const url = `http://127.0.0.1:${address.port}/profiles`;
try {
  const invalid = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: " " }),
  });
  assert.equal(invalid.status, 400);
  for (const title of ["North location", "South location"]) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, country: "Testland", isApproved: true }),
    });
    assert.equal(response.status, 201, await response.clone().text());
    const profile = await response.json();
    assert.equal(profile.userId, null);
    assert.equal(profile.directoryMode, "store_locator");
    assert.equal(profile.user.firstName, title);
    assert.equal((await storage.therapists.getProfileWithUser(profile.id))?.id, profile.id);
  }
  assert.equal(await countUsers(), before, "Location creation must not create accounts");
  const results = await storage.therapists.listProfilesPaginated({
    directoryMode: "store_locator",
  });
  assert.equal(results.total, 2);
  const filters = await storage.therapists.getFilterOptions(true, "store_locator");
  assert.ok(filters.countries.includes("Testland"));
  console.log(
    "PASS: standalone creation, name validation, detail lookup, listing, filters, and unchanged user count",
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}
