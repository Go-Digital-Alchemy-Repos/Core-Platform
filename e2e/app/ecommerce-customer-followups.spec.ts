import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
function database() {
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
    throw new Error("Disposable local database required");
  return new pg.Pool({
    connectionString: value,
    max: 1,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
}
test("checkout custom choice stays selected when street is cleared and addresses refetch", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "browser-customer-a@example.test", password: "CoreBrowserTest!2026" },
  });
  expect(login.ok()).toBe(true);
  const created = await page.request.post("/api/ecommerce/account/addresses", {
    data: {
      label: "Synthetic default",
      address: "10 Synthetic Street",
      city: "Albany",
      state: "NY",
      zipCode: "12207",
      country: "US",
      isDefault: true,
    },
  });
  expect(created.ok(), await created.text()).toBe(true);
  const address = await created.json();
  let payments = 0;
  await page.route("**/api/ecommerce/checkout/payment-intent", async (route) => {
    payments++;
    await route.abort("blockedbyclient");
  });
  try {
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
    await page.goto("/checkout");
    await expect(page.getByLabel("Address", { exact: true })).toHaveValue("10 Synthetic Street");
    const custom = page.locator('[role="radio"][value="custom"]');
    await custom.click();
    await page.getByLabel("Address", { exact: true }).fill("");
    await page.evaluate(async () => {
      const path = "/src/lib/queryClient.ts";
      const { queryClient } = await import(/* @vite-ignore */ path);
      await queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/account/addresses"] });
    });
    await expect(page.getByLabel("Address", { exact: true })).toHaveValue("");
    await expect(custom).toHaveAttribute("aria-checked", "true");
    await page.getByLabel("Address", { exact: true }).fill("22 Custom Street");
    await expect(custom).toHaveAttribute("aria-checked", "true");
    let releaseAddresses!: () => void;
    const heldAddresses = new Promise<void>((resolve) => {
      releaseAddresses = resolve;
    });
    await page.route("**/api/ecommerce/account/addresses", async (route) => {
      const response = await route.fetch();
      await heldAddresses;
      await route.fulfill({ response });
    });
    await page.reload();
    await page.getByLabel("Full name", { exact: true }).fill("Deliberate late draft");
    releaseAddresses();
    await expect(page.locator(`[role="radio"][value="${address.id}"]`)).toBeVisible();
    await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
      "Deliberate late draft",
    );
    await expect(page.getByLabel("Address", { exact: true })).toHaveValue("");
    await expect(custom).toHaveAttribute("aria-checked", "true");
    await page.unroute("**/api/ecommerce/account/addresses");
    expect(payments).toBe(0);
  } finally {
    expect((await page.request.delete(`/api/ecommerce/account/addresses/${address.id}`)).ok()).toBe(
      true,
    );
  }
});

test("order status errors recover, clear stale details and ignore older lookup responses", async ({
  page,
}) => {
  const db = database();
  const ids = [randomUUID(), randomUUID()];
  const token = "synthetic-status-" + randomUUID();
  try {
    for (const id of ids)
      await db.query(
        "INSERT INTO ecommerce_orders(id,customer_id,status,payment_status,total_amount,lookup_token) VALUES($1,'browser-manual-customer','paid','paid',2500,$2)",
        [id, token + id],
      );
    await page.goto(
      `/orders/status?orderId=${ids[0]}&email=offline-buyer%40example.test&token=${token + ids[0]}`,
    );
    await expect(page.getByText("#" + ids[0], { exact: true })).toBeVisible();
    await page.getByLabel("Order ID", { exact: true }).fill(ids[1]);
    await expect(page.getByRole("heading", { name: "Order details" })).toHaveCount(0);
    await page.getByLabel("Secure token", { exact: true }).fill(token + ids[1]);
    let fail = true;
    await page.route("**/api/ecommerce/orders/status", (route) =>
      fail ? route.abort("failed") : route.continue(),
    );
    await page.getByRole("button", { name: "Find order", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Order could not be loaded. Check your details and try again.",
    );
    await expect(page.getByLabel("Order ID", { exact: true })).toHaveValue(ids[1]);
    fail = false;
    await page.getByRole("button", { name: "Find order", exact: true }).click();
    await expect(page.getByText("#" + ids[1], { exact: true })).toBeVisible();
    await page.unroute("**/api/ecommerce/orders/status");
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let observed!: () => void;
    const started = new Promise<void>((resolve) => {
      observed = resolve;
    });
    await page.route("**/api/ecommerce/orders/status", async (route) => {
      if (route.request().postDataJSON().orderId === ids[0]) {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        observed();
        await held;
        await route.fulfill({ response });
      } else await route.continue();
    });
    await page.getByLabel("Order ID", { exact: true }).fill(ids[0]);
    await page.getByLabel("Secure token", { exact: true }).fill(token + ids[0]);
    await page.getByRole("button", { name: "Find order", exact: true }).click();
    await started;
    await expect(page.getByRole("button", { name: "Finding order…", exact: true })).toBeDisabled();
    await page.getByLabel("Order ID", { exact: true }).fill(ids[1]);
    await page.getByLabel("Secure token", { exact: true }).fill(token + ids[1]);
    await page.getByRole("button", { name: "Find order", exact: true }).click();
    await expect(page.getByText("#" + ids[1], { exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/orders/status") &&
        response.request().postDataJSON().orderId === ids[0],
    );
    release();
    await oldResponse;
    await expect(page.getByText("#" + ids[1], { exact: true })).toBeVisible();
    await expect(page.getByText("#" + ids[0], { exact: true })).toHaveCount(0);
    // A nonexistent order guarantees the real retry endpoint cannot send email.
    await page.getByLabel("Order ID", { exact: true }).fill("missing-" + randomUUID());
    await page.getByLabel("Secure token", { exact: true }).fill("");
    await page.route("**/api/ecommerce/orders/status-link", (route) => route.abort("failed"));
    await page.getByRole("button", { name: "Email secure status link", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Secure status link could not be requested. Please try again.",
    );
    await page.unroute("**/api/ecommerce/orders/status-link");
    await page.getByRole("button", { name: "Email secure status link", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "If that order matches" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Order details" })).toHaveCount(0);
  } finally {
    await db.query("DELETE FROM ecommerce_orders WHERE id=ANY($1::varchar[])", [ids]);
    await db.end();
  }
});
