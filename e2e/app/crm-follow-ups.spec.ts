import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
const ownedLeads: string[] = [];
const ownedClients: string[] = [];
test.afterEach(async () => {
  const value = process.env.BROWSER_TEST_DATABASE_URL;
  if (!value) throw new Error("Disposable browser database required");
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Disposable loopback browser database required");
  const pool = new pg.Pool({
    connectionString: value,
    max: 1,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
  try {
    // Only this spec's API-created records; task rows are removed through their FKs.
    if (ownedClients.length)
      await pool.query("DELETE FROM crm_clients WHERE id = ANY($1::varchar[])", [ownedClients]);
    if (ownedLeads.length)
      await pool.query("DELETE FROM crm_leads WHERE id = ANY($1::varchar[])", [ownedLeads]);
    ownedClients.length = 0;
    ownedLeads.length = 0;
  } finally {
    await pool.end();
  }
});
const base = "/api/admin/crm";
async function login(page: Page, email = "browser-admin@example.test") {
  const r = await page.request.post("/api/auth/login", {
    data: { email, password: "CoreBrowserTest!2026" },
  });
  expect(r.ok()).toBe(true);
  return r.json();
}
async function post(page: Page, path: string, data: unknown) {
  const r = await page.request.post(path, { data });
  expect(r.ok(), await r.text()).toBe(true);
  const result = await r.json();
  if (path === base) ownedLeads.push(result.lead.id);
  if (path === base + "/clients") ownedClients.push(result.id);
  return result;
}
test("follow-up worklist filters, assignment, completion, record links and recoverable failures", async ({
  page,
}) => {
  test.setTimeout(90000);
  const editor = await login(page, "browser-editor@example.test");
  await login(page);
  const suffix = randomUUID().slice(0, 8);
  const lead = (await post(page, base, { name: `Follow lead ${suffix}` })).lead;
  const client = await post(page, base + "/clients", { name: `Follow client ${suffix}` });
  const title = `Call ${suffix}`,
    clientTitle = `Review ${suffix}`;
  const task = await post(page, `${base}/${lead.id}/tasks`, {
    title,
    dueAt: "1990-01-01",
    assignedToId: null,
  });
  const clientTask = await post(page, `${base}/clients/${client.id}/tasks`, {
    title: clientTitle,
    dueAt: null,
    assignedToId: editor.id,
  });
  expect(
    (
      await page.request.patch(`${base}/tasks/${task.id}`, {
        data: { assignedToId: "missing-user" },
      })
    ).status(),
  ).toBe(400);
  let fail = true;
  await page.route("**/api/admin/crm/follow-ups?*", (route) =>
    fail ? route.abort("failed") : route.continue(),
  );
  await page.goto("/admin/crm/follow-ups");
  await expect(page.getByRole("button", { name: "Retry worklist" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry worklist" }).click();
  const row = page.getByRole("article", { name: title, exact: true });
  await expect(row).toBeVisible();
  await expect(row.getByText(/UTC/)).toBeVisible();
  await page.getByLabel("Record type", { exact: true }).selectOption("client");
  await expect(row).toHaveCount(0);
  await expect(page.getByRole("article", { name: clientTitle, exact: true })).toBeVisible();
  await page.getByLabel("Record type", { exact: true }).selectOption("all");
  await page.getByLabel("Due", { exact: true }).selectOption("overdue");
  await expect(row).toBeVisible();
  await expect(page.getByRole("article", { name: clientTitle, exact: true })).toHaveCount(0);
  await page.getByLabel("Due", { exact: true }).selectOption("undated");
  await expect(page.getByRole("article", { name: clientTitle, exact: true })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Due", { exact: true }).selectOption("all");
  await page.getByLabel("Owner", { exact: true }).selectOption("mine");
  await expect(row).toBeVisible();
  await expect(page.getByRole("article", { name: clientTitle, exact: true })).toHaveCount(0);
  await row.getByLabel("Assignee", { exact: true }).selectOption(editor.id);
  const lookup = page.waitForResponse((response) =>
    response.url().includes("/follow-ups/assignees?query=no-match"),
  );
  await page.getByLabel("Find an assignee", { exact: true }).fill("no-match");
  await lookup;
  await expect(row.getByLabel("Assignee", { exact: true })).toHaveValue(editor.id);
  await expect(row.getByLabel("Assignee", { exact: true }).locator("option:checked")).toHaveText(
    "Browser Editor",
  );
  await page.getByLabel("Find an assignee", { exact: true }).fill("");
  let failSave = true;
  await page.route(`**/api/admin/crm/tasks/${task.id}`, (route) =>
    failSave ? route.abort("failed") : route.continue(),
  );
  await row.getByRole("button", { name: "Save task" }).click();
  await expect(row.getByRole("alert")).toBeVisible();
  await expect(row.getByLabel("Assignee", { exact: true })).toHaveValue(editor.id);
  failSave = false;
  await row.getByRole("button", { name: "Save task" }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Owner", { exact: true }).selectOption("user");
  await page.getByLabel("Owner account", { exact: true }).selectOption(editor.id);
  await expect(row).toBeVisible();
  await row.getByLabel("Assignee", { exact: true }).selectOption("");
  await row.getByRole("button", { name: "Save task" }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Owner", { exact: true }).selectOption("unassigned");
  await expect(row).toBeVisible();
  await row.getByLabel("Completed", { exact: true }).check();
  await row.getByRole("button", { name: "Save task" }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Completion", { exact: true }).selectOption("completed");
  await expect(row).toBeVisible();
  await page.reload();
  await page.getByLabel("Completion", { exact: true }).selectOption("completed");
  await expect(row.getByLabel("Completed", { exact: true })).toBeChecked();
  await expect(row.getByLabel("Assignee", { exact: true })).toHaveValue("");
  await row.getByRole("link", { name: `Follow lead ${suffix} (lead)` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(`Follow lead ${suffix}`);
  await page.goto("/admin/crm/follow-ups");
  await page.getByRole("article", { name: clientTitle, exact: true }).getByRole("link").click();
  await expect(page.getByRole("dialog")).toContainText(`Follow client ${suffix}`);
  const details = await page.request.get(`${base}/${lead.id}`);
  expect((await details.json()).tasks.find((x: { id: string }) => x.id === task.id)).toMatchObject({
    completed: true,
    assignedToId: null,
  });
  expect((await page.request.get(`${base}/clients/${client.id}`)).ok()).toBe(true);
  expect(clientTask.assignedToId).toBe(editor.id);
});

test("refresh from cached page two fetches a new first page and clock", async ({ page }, info) => {
  test.setTimeout(90000);
  await login(page);
  const suffix = randomUUID().slice(0, 8);
  const year = info.project.name.endsWith("mobile") ? "1000" : "1100";
  const lead = (await post(page, base, { name: `Paging ${suffix}` })).lead;
  for (let index = 1; index <= 26; index++)
    await post(page, `${base}/${lead.id}/tasks`, {
      title: `Page ${suffix} ${index}`,
      dueAt: `${year}-01-${String(index).padStart(2, "0")}T00:00:00Z`,
    });
  const initialResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/crm/follow-ups?") &&
      !new URL(response.url()).searchParams.has("cursor"),
  );
  await page.goto("/admin/crm/follow-ups");
  const original = await (await initialResponse).json();
  await expect(page.getByRole("article", { name: `Page ${suffix} 1`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("article", { name: `Page ${suffix} 26`, exact: true })).toBeVisible();
  await post(page, `${base}/${lead.id}/tasks`, {
    title: `New first ${suffix}`,
    dueAt: `${String(Number(year) - 1).padStart(4, "0")}-12-31T00:00:00Z`,
  });
  const refreshedResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/crm/follow-ups?") &&
      !new URL(response.url()).searchParams.has("cursor"),
  );
  await page.getByRole("button", { name: "Refresh worklist", exact: true }).click();
  const refreshed = await (await refreshedResponse).json();
  expect(new Date(refreshed.asOf).getTime()).toBeGreaterThan(new Date(original.asOf).getTime());
  expect(refreshed.items[0].title).toBe(`New first ${suffix}`);
  await expect(
    page.getByRole("article", { name: `New first ${suffix}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "First page", exact: true })).toHaveCount(0);
});

test("failed background refetch after saving B preserves row A's unsaved assignment", async ({
  page,
}, info) => {
  const editor = await login(page, "browser-editor@example.test");
  await login(page);
  const suffix = randomUUID().slice(0, 8),
    year = info.project.name.endsWith("mobile") ? "0800" : "0900";
  const lead = (await post(page, base, { name: `Drafts ${suffix}` })).lead;
  const a = await post(page, `${base}/${lead.id}/tasks`, {
    title: `Draft A ${suffix}`,
    dueAt: `${year}-01-01T00:00:00Z`,
  });
  await post(page, `${base}/${lead.id}/tasks`, {
    title: `Save B ${suffix}`,
    dueAt: `${year}-01-02T00:00:00Z`,
  });
  await page.goto("/admin/crm/follow-ups");
  const rowA = page.getByRole("article", { name: `Draft A ${suffix}`, exact: true });
  const rowB = page.getByRole("article", { name: `Save B ${suffix}`, exact: true });
  await rowA.getByLabel("Assignee", { exact: true }).selectOption(editor.id);
  let fail = true;
  await page.route("**/api/admin/crm/follow-ups?*", (route) =>
    fail ? route.abort("failed") : route.continue(),
  );
  await rowB.getByLabel("Completed", { exact: true }).check();
  await rowB.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByRole("button", { name: "Retry worklist" })).toBeVisible();
  await expect(rowA).toBeVisible();
  await expect(rowA.getByLabel("Assignee", { exact: true })).toHaveValue(editor.id);
  fail = false;
  await page.getByRole("button", { name: "Retry worklist" }).click();
  await expect(page.getByRole("button", { name: "Retry worklist" })).toHaveCount(0);
  await expect(rowB).toHaveCount(0);
  await expect(rowA.getByLabel("Assignee", { exact: true })).toHaveValue(editor.id);
  await rowA.getByRole("button", { name: "Save task" }).click();
  await expect(rowA.getByRole("button", { name: "Save task" })).toBeDisabled();
  const result = await page.request.get(`${base}/${lead.id}`);
  expect(
    (await result.json()).tasks.find((task: { id: string }) => task.id === a.id).assignedToId,
  ).toBe(editor.id);
});
