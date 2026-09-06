import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from "vitest";
const url = process.env.CRM_NOTE_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    u.hostname !== "127.0.0.1" ||
    u.pathname !== "/core_crm_note_test" ||
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
    connectionString: process.env.CRM_NOTE_TEST_DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }) };
});
import { pool } from "../db";
import { runMigrations } from "../migrate";
import { CrmStorage } from "./crm.storage";
const storage = new CrmStorage();
describe.skipIf(!url)("CRM note attribution PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60000);
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE crm_leads,crm_clients,users CASCADE");
    await pool.query(
      `INSERT INTO users(id,email,password,first_name,last_name) VALUES ('named','named@example.test','private-password','  Ada ',' Lovelace '),('partial','partial@example.test','private-password',NULL,' Solo '),('blank','blank@example.test','private-password','  ',NULL); INSERT INTO crm_leads(id,name) VALUES ('lead','Lead'); INSERT INTO crm_clients(id,name) VALUES ('client','Client');`,
    );
  });
  it.each(["lead", "client"] as const)(
    "projects only safe author names while retaining every %s note and current-profile/deletion behavior",
    async (kind) => {
      const create = (createdById: string | null, body: string) =>
        kind === "lead"
          ? storage.createNote({ leadId: "lead", createdById, body })
          : storage.createClientNote({ clientId: "client", createdById, body });
      const list = () =>
        kind === "lead" ? storage.listNotes("lead") : storage.listClientNotes("client");
      for (const [actor, body] of [
        ["named", "first"],
        ["partial", "second"],
        ["blank", "third"],
        [null, "fourth"],
      ] as const) {
        const note = await create(actor, body);
        expect(note).not.toHaveProperty("authorName");
        await pool.query(
          `UPDATE ${kind === "lead" ? "crm_lead_notes" : "crm_client_notes"} SET created_at=$1 WHERE id=$2`,
          [
            `2026-09-0${["first", "second", "third", "fourth"].indexOf(body) + 1}T00:00:00Z`,
            note.id,
          ],
        );
      }
      const notes = await list();
      expect(notes.map((n) => [n.body, n.authorName])).toEqual([
        ["fourth", null],
        ["third", null],
        ["second", "Solo"],
        ["first", "Ada Lovelace"],
      ]);
      for (const note of notes)
        expect(Object.keys(note).sort()).toEqual(
          ["id", kind + "Id", "body", "createdById", "createdAt", "authorName"].sort(),
        );
      expect(JSON.stringify(notes)).not.toMatch(/private-password|@example.test|adminPermissions/);
      await pool.query(
        "UPDATE users SET first_name='Grace',last_name='Hopper',is_suspended=true WHERE id='named'",
      );
      expect((await list()).find((n) => n.body === "first")?.authorName).toBe("Grace Hopper");
      await pool.query("DELETE FROM users WHERE id='named'");
      expect((await list()).find((n) => n.body === "first")).toMatchObject({
        authorName: null,
        createdById: null,
        body: "first",
      });
      expect(await list()).toHaveLength(4);
    },
  );
});
