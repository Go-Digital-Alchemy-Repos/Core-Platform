import { expect, test, type Page } from "@playwright/test";
import { insertCmsFormSchema } from "../../shared/schema/forms";
import { DEFAULT_CRM_PIPELINE_CONFIG } from "../../shared/crm-pipeline-settings";

async function login(page: Page, email = "browser-admin@example.test") {
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

test("explicit mapping preview, conflict recovery and durable public intake", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(100_000);
  page.setDefaultTimeout(15_000);
  await login(page);
  expect(
    (
      await page.request.put("/api/admin/crm/settings/pipeline", {
        data: DEFAULT_CRM_PIPELINE_CONFIG,
      })
    ).status(),
  ).toBe(200);
  const suffix = `${info.project.name.endsWith("mobile") ? "m" : "d"}_${Date.now()}`;
  const name = `Mapped visitor ${suffix}`;
  const email = `mapped-${suffix}@example.test`;
  const definitionResponse = await page.request.post("/api/admin/crm/settings/custom-fields", {
    data: {
      key: `budget_${suffix}`,
      type: "number",
      entityScope: "both",
      config: { version: 1, label: `Mapped budget ${suffix}`, copyOnConversion: true },
    },
  });
  expect(definitionResponse.status(), await definitionResponse.text()).toBe(201);
  const definition = (await definitionResponse.json()).definitions.find(
    (field: { key: string }) => field.key === `budget_${suffix}`,
  );
  const created = await page.request.post("/api/admin/forms", {
    data: insertCmsFormSchema.parse({
      name: `Mapping browser ${suffix}`,
      slug: `mapping-browser-${suffix}`,
      fields: [
        { id: "name", key: "full_name", label: "Visitor name", type: "text", required: true },
        { id: "contact", key: "contact", label: "Visitor email", type: "email", required: true },
        { id: "budget", key: "budget", label: "Budget", type: "number" },
        { id: "trap", key: "email", label: "Unmapped legacy email", type: "email" },
      ],
      settings: {
        createCrmLead: true,
        notifyAdmins: false,
        mailchimpEnabled: false,
        storeAsContactMessage: false,
      },
    }),
  });
  expect(created.status(), await created.text()).toBe(201);
  const form = await created.json();
  const mappingUrl = `/api/admin/forms/${form.id}/crm-mapping`;
  const submissions = () =>
    page.request.get(`/api/admin/forms/${form.id}/submissions`).then((r) => r.json());
  await page.goto("/admin/forms");
  await page.getByText(form.name, { exact: true }).click();
  await page.getByLabel("Enable explicit CRM mapping", { exact: true }).check();
  for (const [index, source, target] of [
    [1, "name", "builtin:name"],
    [2, "contact", "builtin:email"],
    [3, "budget", `custom:${definition.id}`],
  ] as const) {
    await page.getByRole("button", { name: "Add field mapping", exact: true }).click();
    await page.getByLabel(`Source field ${index}`, { exact: true }).selectOption(source);
    await page.getByLabel(`CRM target ${index}`, { exact: true }).selectOption(target);
  }
  const sample = {
    full_name: name,
    contact: email,
    budget: "0",
    email: `trap-${suffix}@example.test`,
  };
  await page
    .getByRole("textbox", { name: "Sample form data (JSON)", exact: true })
    .fill(JSON.stringify(sample));
  await page.getByRole("button", { name: "Preview CRM mapping", exact: true }).click();
  const preview = page.getByLabel("CRM mapping preview", { exact: true });
  await expect(preview).toContainText(email);
  const resolved = JSON.parse(await preview.innerText());
  expect(resolved).toMatchObject({
    ok: true,
    mode: "explicit",
    normalizedBuiltins: { name, email },
    customValues: [{ definitionId: definition.id, value: 0 }],
  });
  expect(await submissions()).toHaveLength(0);
  expect(
    await (await page.request.get(`/api/admin/crm?q=${encodeURIComponent(email)}`)).json(),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Save CRM mapping", exact: true }).click();
  await expect(page.getByText("CRM mapping saved.", { exact: true })).toBeVisible();
  const saved = await (await page.request.get(mappingUrl)).json();
  expect(saved.revision).toBe(1);
  // A real concurrent write advances the revision while this browser retains its draft.
  expect(
    (
      await page.request.put(mappingUrl, {
        data: { expectedRevision: 1, mapping: { ...saved.mapping, revision: 2 } },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel("Require mapped value 3", { exact: true }).check();
  await page.getByRole("button", { name: "Save CRM mapping", exact: true }).click();
  await expect(page.getByText(/Mapping changed or is incompatible/)).toBeVisible();
  await expect(page.getByLabel("Require mapped value 3", { exact: true })).toBeChecked();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reload saved mapping", exact: true }).click();
  await expect(page.getByLabel("Require mapped value 3", { exact: true })).not.toBeChecked();
  const publicForm = await (await page.request.get(`/api/forms/${form.slug}`)).json();
  expect(publicForm).not.toHaveProperty("crmMapping");
  expect(publicForm).not.toHaveProperty("crmMappingRevision");
  const publicContext = await browser.newContext();
  try {
    const submit = () =>
      publicContext.request.post(`/api/forms/${form.slug}/submit`, {
        data: sample,
        headers: { "Idempotency-Key": `mapping-${suffix}` },
      });
    const accepted = await submit();
    expect(accepted.status(), await accepted.text()).toBe(201);
    const receipt = await accepted.json();
    const replay = await submit();
    expect(replay.status()).toBe(200);
    expect((await replay.json()).submissionId).toBe(receipt.submissionId);
  } finally {
    await publicContext.close();
  }
  expect(await submissions()).toHaveLength(1);
  let lead: { id: string } | undefined;
  await expect
    .poll(
      async () => {
        const found = await (
          await page.request.get(`/api/admin/crm?q=${encodeURIComponent(email)}`)
        ).json();
        lead = found.find((item: { email: string }) => item.email === email);
        return Boolean(lead);
      },
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
  const acceptedValues = await (
    await page.request.get(`/api/admin/crm/leads/${lead!.id}/custom-fields`)
  ).json();
  expect(
    acceptedValues.values.find(
      (value: { definitionId: string }) => value.definitionId === definition.id,
    ),
  ).toMatchObject({ value: 0, definitionRevision: definition.revision });
  await page.goto("/admin/crm");
  await page.getByRole("button", { name: `Open ${name}`, exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel(`Mapped budget ${suffix}`, { exact: true }),
  ).toHaveValue("0");
  await page.screenshot({ path: info.outputPath("mapped-intake-lead.png") });
  await page.getByRole("dialog").getByTestId("select-crm-lead-stage").click();
  await page.getByRole("option", { name: "Won", exact: true }).click();
  let clientId: string | undefined;
  await expect
    .poll(async () => {
      const detail = await (await page.request.get(`/api/admin/crm/${lead!.id}`)).json();
      clientId = detail.client?.id;
      return detail.stage;
    })
    .toBe("won");
  expect(clientId).toBeTruthy();
  const copied = await (
    await page.request.get(`/api/admin/crm/clients/${clientId}/custom-fields`)
  ).json();
  expect(
    copied.values.find((value: { definitionId: string }) => value.definitionId === definition.id),
  ).toMatchObject({ value: 0, definitionRevision: definition.revision });
  const editor = await browser.newContext();
  try {
    const editorPage = await editor.newPage();
    await login(editorPage, "browser-editor@example.test");
    expect((await editorPage.request.get(mappingUrl)).status()).toBe(403);
    expect(
      (
        await editorPage.request.put(mappingUrl, { data: { expectedRevision: 2, mapping: null } })
      ).status(),
    ).toBe(403);
  } finally {
    await editor.close();
  }
});
