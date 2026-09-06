import { expect, test, type Page } from "@playwright/test";

const account = "/api/ecommerce/account";
const settings = "/api/ecommerce/checkout/settings";
async function login(page: Page, identity = "a") {
  const response = await page.request.post("/api/auth/login", {
    data: { email: `browser-customer-${identity}@example.test`, password: "CoreBrowserTest!2026" },
  });
  expect(response.ok(), await response.text()).toBe(true);
}
// Trigger an actual query refetch without replacing any response or cached data.
async function refetch(page: Page, key: string) {
  await page.evaluate(async (queryKey) => {
    const modulePath = "/src/lib/queryClient.ts";
    const { queryClient } = await import(/* @vite-ignore */ modulePath);
    await queryClient.invalidateQueries({ queryKey: [queryKey] });
  }, key);
}
async function save(page: Page, label: string, path: string) {
  const response = page.waitForResponse(
    (res) => res.url().endsWith(path) && res.request().method() === "PUT",
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  expect((await response).ok()).toBe(true);
  await expect(page.getByRole("button", { name: label, exact: true })).toBeEnabled();
}

test("account load and save recovery retains drafts and persists profile/preferences", async ({
  page,
}) => {
  await login(page);
  expect(
    (
      await page.request.put(`${account}/profile`, {
        data: { firstName: "Initial", lastName: "Customer", phone: "" },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.put(`${account}/preferences`, {
        data: { marketingEmailOptIn: false, orderSmsOptIn: false },
      })
    ).ok(),
  ).toBe(true);
  let failLoad = true;
  await page.route(`**${account}`, (route) =>
    failLoad ? route.abort("failed") : route.continue(),
  );
  await page.goto("/account/profile");
  await expect(
    page.getByRole("alert").filter({ hasText: "Account details could not be loaded" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(0);
  failLoad = false;
  await page.getByRole("button", { name: "Retry account" }).click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Initial");
  await page.getByLabel("First name", { exact: true }).fill("Recovered");
  await page.getByLabel("Phone", { exact: true }).fill("2025550101");
  // Change persisted data first so structural sharing cannot skip the hydration effect.
  expect(
    (
      await page.request.put(`${account}/profile`, {
        data: { firstName: "Background", lastName: "Customer", phone: "2025550104" },
      })
    ).ok(),
  ).toBe(true);
  // A real successful background GET must not replace unsaved edits.
  await refetch(page, account);
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Recovered");
  let failSave = true;
  await page.route(`**${account}/profile`, (route) =>
    failSave ? route.abort("failed") : route.continue(),
  );
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your changes could not be saved" }),
  ).toBeVisible();
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("2025550101");
  expect((await (await page.request.get(account)).json()).customer.name).toBe(
    "Background Customer",
  );
  failSave = false;
  await save(page, "Save profile", `${account}/profile`);
  await page.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Recovered");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("2025550101");
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await page.getByRole("switch", { name: "Marketing emails" }).check();
  await page.getByRole("switch", { name: "SMS order updates" }).check();
  expect(
    (
      await page.request.put(`${account}/preferences`, {
        data: { marketingEmailOptIn: true, orderSmsOptIn: false },
      })
    ).ok(),
  ).toBe(true);
  await refetch(page, account);
  await expect(page.getByRole("switch", { name: "Marketing emails" })).toBeChecked();
  let failPreferences = true;
  await page.route(`**${account}/preferences`, (route) =>
    failPreferences ? route.abort("failed") : route.continue(),
  );
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your changes could not be saved" }),
  ).toBeVisible();
  await expect(page.getByRole("switch", { name: "SMS order updates" })).toBeChecked();
  failPreferences = false;
  await save(page, "Save preferences", `${account}/preferences`);
  await page.reload();
  await expect(page.getByRole("switch", { name: "Marketing emails" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "SMS order updates" })).toBeChecked();
  const persisted = (await (await page.request.get(account)).json()).customer;
  expect(persisted).toMatchObject({
    name: "Recovered Customer",
    phone: "2025550101",
    marketingEmailOptIn: true,
    orderSmsOptIn: true,
  });
});

test("changing authenticated customer clears prior account data and dirty draft", async ({
  page,
}) => {
  await login(page, "b");
  expect(
    (
      await page.request.put(`${account}/profile`, {
        data: { firstName: "Second", lastName: "Identity", phone: "2025550102" },
      })
    ).ok(),
  ).toBe(true);
  await login(page, "a");
  await page.goto("/account/profile");
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Private unsaved first customer");
  await login(page, "b");
  // Simulate another tab changing the real session, then the mounted app checking /auth/me.
  // Hold B's overview response so the intervening loading state is also checked.
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${account}`, async (route) => {
    await held;
    await route.continue();
  });
  await refetch(page, "/api/auth/me");
  await expect(page.getByText("Loading account...", { exact: true })).toBeVisible();
  await expect(page.locator('input[value="Private unsaved first customer"]')).toHaveCount(0);
  release();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Second");
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("2025550102");
  await expect(page.locator('input[value="browser-customer-a@example.test"]')).toHaveCount(0);
  await expect(page.locator('input[value="browser-customer-b@example.test"]')).toBeVisible();
});

test("checkout settings failure blocks progress and retry retains entered details without payment calls", async ({
  page,
}) => {
  let paymentCalls = 0;
  await page.route("**/api/ecommerce/checkout/payment-intent", async (route) => {
    paymentCalls++;
    await route.abort("blockedbyclient");
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "core-platform-ecommerce-cart",
      JSON.stringify([
        {
          productId: "browser-manual-product",
          variantId: "browser-manual-variant",
          name: "Browser offline product",
          slug: "browser-offline-product",
          quantity: 1,
          unitPrice: 2500,
        },
      ]),
    ),
  );
  let fail = true;
  await page.route(`**${settings}`, (route) => (fail ? route.abort("failed") : route.continue()));
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: "Retry checkout settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeHidden();
  fail = false;
  await page.getByRole("button", { name: "Retry checkout settings" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Retained Checkout Draft");
  await page.getByLabel("Email", { exact: true }).fill("checkout-draft@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("2025550103");
  fail = true;
  await refetch(page, settings);
  await expect(page.getByRole("button", { name: "Retry checkout settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeHidden();
  fail = false;
  await page.getByRole("button", { name: "Retry checkout settings" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Retained Checkout Draft",
  );
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "checkout-draft@example.test",
  );
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("2025550103");
  expect(paymentCalls).toBe(0);
});
