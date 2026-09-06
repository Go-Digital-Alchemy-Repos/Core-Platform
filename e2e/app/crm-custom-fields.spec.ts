import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_CRM_PIPELINE_CONFIG } from "../../shared/crm-pipeline-settings";

const definitionsPath = "/api/admin/crm/settings/custom-fields";
async function login(page: Page, email = "browser-admin@example.test") {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}
async function createDefinition(
  page: Page,
  key: string,
  label: string,
  type: "number" | "boolean",
) {
  await page.getByRole("button", { name: "New custom field", exact: true }).click();
  await page.getByLabel("Field key", { exact: true }).fill(key);
  await page.getByLabel("Label", { exact: true }).fill(label);
  await page.getByLabel("Entity scope").selectOption("both");
  await page.getByLabel("Field type").selectOption(type);
  await page.getByLabel("Copy lead value when first converted to a client").check();
  const input = page.getByLabel("Default for new manual records");
  if (type === "number") await input.fill("0");
  else await input.selectOption("false");
  const response = page.waitForResponse(
    (r) => r.url().endsWith(definitionsPath) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create custom field", exact: true }).click();
  const saved = await response;
  expect(saved.status(), await saved.text()).toBe(201);
  return (await saved.json()).definitions.find((field: { key: string }) => field.key === key) as {
    id: string;
    revision: number;
  };
}
async function values(page: Page, scope: "leads" | "clients", id: string) {
  const response = await page.request.get(`/api/admin/crm/${scope}/${id}/custom-fields`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<{
    revision: number;
    values: Array<{ definitionId: string; definitionRevision: number; value: unknown }>;
  }>;
}

test("typed manual values, atomic won copy, conflict retention and archived history", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(15000);
  await login(page);
  expect(
    (
      await page.request.put("/api/admin/crm/settings/pipeline", {
        data: DEFAULT_CRM_PIPELINE_CONFIG,
      })
    ).status(),
  ).toBe(200);
  const suffix = `${info.project.name.endsWith("mobile") ? "m" : "d"}_${Date.now()}`;
  const numberLabel = `Farm size ${suffix}`,
    boolLabel = `Organic ${suffix}`;
  await page.goto("/admin/crm/settings");
  await page.getByRole("tab", { name: "Custom fields", exact: true }).click();
  const number = await createDefinition(page, `size_${suffix}`, numberLabel, "number");
  const boolean = await createDefinition(page, `organic_${suffix}`, boolLabel, "boolean");
  await page.goto("/admin/crm");
  await page.getByTestId("button-create-crm-lead").click();
  const dialog = page.getByRole("dialog");
  const leadName = `Typed browser ${suffix}`;
  await dialog.getByTestId("input-crm-lead-name").fill(leadName);
  await expect(dialog.getByLabel(numberLabel, { exact: true })).toHaveValue("0");
  await expect(dialog.getByLabel(boolLabel, { exact: true })).toHaveValue("false");
  const creating = page.waitForResponse(
    (r) => r.url().endsWith("/api/admin/crm") && r.request().method() === "POST",
  );
  await dialog.getByTestId("button-save-crm-lead").click();
  const created = await creating;
  expect(created.status(), await created.text()).toBe(201);
  const lead = (await created.json()).lead as { id: string };
  await expect(dialog).not.toBeVisible();
  const leadValues = await values(page, "leads", lead.id);
  expect(leadValues.values.find((v) => v.definitionId === number.id)?.value).toBe(0);
  expect(leadValues.values.find((v) => v.definitionId === boolean.id)?.value).toBe(false);
  await page.getByRole("button", { name: `Open ${leadName}`, exact: true }).click();
  await dialog.getByLabel(numberLabel, { exact: true }).fill("12.5");
  await dialog.getByRole("button", { name: "Save custom values", exact: true }).click();
  await expect(dialog.getByText("Custom values saved.", { exact: true })).toBeVisible();
  await dialog.getByTestId("select-crm-lead-stage").click();
  await page.getByRole("option", { name: "Won", exact: true }).click();
  await expect
    .poll(async () =>
      (await page.request.get(`/api/admin/crm/${lead.id}`)).json().then((v) => v.stage),
    )
    .toBe("won");
  const detail = await (await page.request.get(`/api/admin/crm/${lead.id}`)).json();
  const clientId = detail.client.id as string;
  expect(
    (await values(page, "clients", clientId)).values.find((v) => v.definitionId === number.id),
  ).toMatchObject({ value: 12.5, definitionRevision: number.revision });
  expect(
    (await values(page, "clients", clientId)).values.find((v) => v.definitionId === boolean.id)
      ?.value,
  ).toBe(false);
  await page.goto("/admin/crm/clients");
  await page.getByText(leadName, { exact: true }).click();
  await dialog.getByLabel(numberLabel, { exact: true }).fill("9");
  const current = await values(page, "clients", clientId);
  expect(
    (
      await page.request.patch(`/api/admin/crm/clients/${clientId}/custom-fields`, {
        data: {
          expectedRevision: current.revision,
          values: [{ definitionId: number.id, definitionRevision: number.revision, value: 77 }],
        },
      })
    ).status(),
  ).toBe(200);
  await dialog.getByRole("button", { name: "Save custom values", exact: true }).click();
  await expect(
    dialog.getByRole("alert").filter({ hasText: "Custom fields changed" }),
  ).toBeVisible();
  await expect(dialog.getByLabel(numberLabel, { exact: true })).toHaveValue("9");
  await dialog.getByRole("button", { name: "Reload saved custom values", exact: true }).click();
  await expect(dialog.getByLabel(numberLabel, { exact: true })).toHaveValue("77");
  await dialog.getByLabel(numberLabel, { exact: true }).fill("8");
  await dialog.getByRole("button", { name: "Save custom values", exact: true }).click();
  await expect(dialog.getByText("Custom values saved.", { exact: true })).toBeVisible();
  expect(
    (await page.request.patch(`/api/admin/crm/${lead.id}`, { data: { stage: "won" } })).status(),
  ).toBe(200);
  expect(
    (await values(page, "clients", clientId)).values.find((v) => v.definitionId === number.id)
      ?.value,
  ).toBe(8);
  for (const theme of ["dark", "light"]) {
    await page.evaluate((mode) => localStorage.setItem("core-platform-theme-mode", mode), theme);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(theme === "dark");
    await page.getByText(leadName, { exact: true }).click();
    await expect(dialog.getByLabel(numberLabel, { exact: true })).toHaveValue("8");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`custom-fields-${theme}.png`) });
  }
  await page.goto("/admin/crm/settings");
  await page.getByRole("tab", { name: "Custom fields", exact: true }).click();
  for (const label of [numberLabel, boolLabel]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByLabel("Archived field", { exact: true }).check();
    await page.getByRole("button", { name: "Save custom field", exact: true }).click();
    await expect(page.getByText("Custom field saved.", { exact: true })).toBeVisible();
  }
  await page.goto("/admin/crm/clients");
  await page.getByText(leadName, { exact: true }).click();
  await expect(
    dialog.getByText(`${numberLabel} (archived, read-only): 8`, { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(`${boolLabel} (archived, read-only): false`, { exact: true }),
  ).toBeVisible();
  const editor = await browser.newContext();
  try {
    const editorPage = await editor.newPage();
    await login(editorPage, "browser-editor@example.test");
    expect(
      (await editorPage.request.post(definitionsPath, { data: { key: "forbidden" } })).status(),
    ).toBe(403);
    await editorPage.goto("/admin/crm/clients");
    await editorPage.getByText(leadName, { exact: true }).click();
    await expect(
      editorPage
        .getByRole("dialog")
        .getByText(`${numberLabel} (archived, read-only): 8`, { exact: true }),
    ).toBeVisible();
  } finally {
    await editor.close();
  }
});
