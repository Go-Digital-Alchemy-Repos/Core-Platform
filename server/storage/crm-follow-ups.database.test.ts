import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
const url = process.env.CRM_FOLLOW_UP_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    u.hostname !== "127.0.0.1" ||
    u.pathname !== "/core_crm_follow_up_test" ||
    u.search ||
    u.hash
  )
    throw new Error("Disposable loopback CRM database required");
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.CRM_FOLLOW_UP_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { CrmFollowUpsStorage } from "./crm-follow-ups.storage";
import { crmFollowUpFiltersSchema } from "@shared/crm-follow-ups";
const storage = new CrmFollowUpsStorage();
const filters = crmFollowUpFiltersSchema.parse({});
describe.skipIf(!url)("follow-up PostgreSQL worklist", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE crm_leads,crm_clients,users CASCADE");
    await pool.query(
      `INSERT INTO users(id,email,password,role,admin_permissions,is_suspended) VALUES ('admin','admin@example.test','synthetic','admin','[]',false),('editor','editor@example.test','synthetic','editor','["crm"]',false),('denied','denied@example.test','synthetic','editor','[]',false),('suspended','suspended@example.test','synthetic','admin','[]',true); INSERT INTO crm_leads(id,name) VALUES ('lead','Lead'); INSERT INTO crm_clients(id,name) VALUES ('client','Client')`,
    );
  });
  it("pages 2000 tasks across both kinds with equal and null dates without omissions", async () => {
    for (const [table, col, id] of [
      ["crm_lead_tasks", "lead_id", "lead"],
      ["crm_client_tasks", "client_id", "client"],
    ])
      await pool.query(
        `INSERT INTO ${table}(id,${col},title,due_at) SELECT 'task-'||lpad(n::text,4,'0'),$1,'Synthetic',CASE WHEN n%3=0 THEN NULL ELSE '2026-09-01 12:00:00.123456'::timestamp END FROM generate_series(1,1000)n`,
        [id],
      );
    const seen = new Set<string>();
    let after;
    let pages = 0;
    while (true) {
      const rows = await storage.list(filters, "admin", "2026-09-01T12:00:00.000Z", 73, after);
      if (!rows.length) break;
      for (const row of rows) {
        const key = row.kind + row.taskId;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
      const last = rows.at(-1)!;
      after = { dueAt: last.dueAt, kind: last.kind, taskId: last.taskId };
      pages++;
    }
    expect(seen.size).toBe(2000);
    expect(pages).toBeGreaterThan(20);
  });
  it("uses exact UTC overdue boundary and explicitly separates undated tasks", async () => {
    await pool.query(
      `INSERT INTO crm_lead_tasks(id,lead_id,title,due_at) VALUES ('before','lead','Before','2026-09-01 11:59:59.999'),('equal','lead','Equal','2026-09-01 12:00'),('after','lead','After','2026-09-01 12:00:00.001'),('none','lead','None',NULL)`,
    );
    for (const timezone of ["UTC", "America/New_York"]) {
      await pool.query(`SET TIME ZONE '${timezone}'`);
      expect(
        (
          await storage.list(
            { ...filters, due: "overdue" },
            "admin",
            "2026-09-01T12:00:00.000Z",
            10,
          )
        ).map((x) => x.taskId),
      ).toEqual(["before"]);
      expect(
        (
          await storage.list(
            { ...filters, due: "upcoming" },
            "admin",
            "2026-09-01T12:00:00.000Z",
            10,
          )
        ).map((x) => x.taskId),
      ).toEqual(["equal", "after"]);
      expect(
        (
          await storage.list(
            { ...filters, due: "undated" },
            "admin",
            "2026-09-01T12:00:00.000Z",
            10,
          )
        ).map((x) => x.taskId),
      ).toEqual(["none"]);
    }
  });
  it("preserves POST null/default, PATCH omission/unassignment and historical assignment", async () => {
    const one = await storage.create("lead", "lead", { title: "One", assignedToId: null }, "admin");
    expect(one.assignedToId).toBe("admin");
    const two = await storage.create("client", "client", { title: "Two" }, "editor");
    expect(two.assignedToId).toBe("editor");
    expect((await storage.update("lead", one.id, { completed: true })).assignedToId).toBe("admin");
    expect((await storage.update("lead", one.id, { assignedToId: null })).assignedToId).toBeNull();
    await pool.query("UPDATE users SET admin_permissions='[]' WHERE id='editor'");
    expect(
      (await storage.update("client", two.id, { assignedToId: "editor", completed: true }))
        .assignedToId,
    ).toBe("editor");
    const page = await storage.list(
      { ...filters, completion: "all" },
      "admin",
      new Date().toISOString(),
      10,
    );
    expect(page.find((x) => x.taskId === two.id)?.assignee?.eligible).toBe(false);
    await expect(storage.update("lead", one.id, { assignedToId: "editor" })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("rejects nonexistent/ineligible targets atomically and missing records/tasks", async () => {
    for (const assignedToId of ["denied", "suspended", "missing"])
      await expect(
        storage.create("lead", "lead", { title: "Bad", assignedToId }, "admin"),
      ).rejects.toMatchObject({ statusCode: 400 });
    expect((await pool.query("SELECT count(*) FROM crm_lead_tasks")).rows[0].count).toBe("0");
    await expect(
      storage.create("client", "missing", { title: "No" }, "admin"),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(storage.update("lead", "missing", { completed: true })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
  it("completion between pages does not shift later cursor rows", async () => {
    const tasks = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        storage.create("lead", "lead", { title: `Task ${i}` }, "admin"),
      ),
    );
    const first = await storage.list(filters, "admin", new Date().toISOString(), 3);
    await Promise.all(first.map((x) => storage.update("lead", x.taskId, { completed: true })));
    const last = first.at(-1)!;
    const next = await storage.list(filters, "admin", new Date().toISOString(), 10, {
      dueAt: last.dueAt,
      kind: last.kind,
      taskId: last.taskId,
    });
    expect(next).toHaveLength(tasks.length - first.length);
    expect(new Set([...first, ...next].map((x) => x.taskId)).size).toBe(8);
  });
  it("lists only eligible assignees with stable bounded search pages", async () => {
    const first = await storage.assignees("", 1);
    expect(first.map((x) => x.id)).toEqual(["admin"]);
    const second = await storage.assignees("", 1, first[0]);
    expect(second.map((x) => x.id)).toEqual(["editor"]);
    expect(await storage.assignees("%", 100)).toEqual([]);
    expect((await storage.assignees("EDITOR", 100)).map((x) => x.id)).toEqual(["editor"]);
  });
  it("locks assignee eligibility against a concurrent permission change", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET admin_permissions='[]' WHERE id='editor'");
      const holderPid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      const write = storage.create(
        "lead",
        "lead",
        { title: "Race", assignedToId: "editor" },
        "admin",
      );
      await expect
        .poll(async () =>
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))",
                [holderPid],
              )
            ).rows[0].count,
          ),
        )
        .toBeGreaterThan(0);
      await client.query("COMMIT");
      await expect(write).rejects.toMatchObject({ statusCode: 400 });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    expect((await pool.query("SELECT count(*) FROM crm_lead_tasks")).rows[0].count).toBe("0");
  });
});
