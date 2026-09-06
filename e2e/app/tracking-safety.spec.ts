import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";

test("actual admin URL-only tracking and customer legacy unsafe tracking are rendered safely", async ({
  page,
}) => {
  test.setTimeout(60000);
  const url = new URL(process.env.BROWSER_TEST_DATABASE_URL || "");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Isolated browser database required");
  const db = new pg.Pool({ connectionString: url.href, max: 1 });
  const id = randomUUID();
  const carrierUrl = "https://carrier.example.test/track/synthetic";
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
  try {
    expect(
      (
        await page.request.post("/api/auth/login", {
          data: { email: "browser-customer-a@example.test", password: "CoreBrowserTest!2026" },
        })
      ).ok(),
    ).toBe(true);
    const overview = await (await page.request.get("/api/ecommerce/account")).json();
    await db.query(
      "INSERT INTO ecommerce_orders(id,customer_id,status,payment_status,total_amount) VALUES($1,$2,'shipped','paid',0)",
      [id, overview.customer.id],
    );
    // Deliberately insert historical unsafe data below the new write boundary. It must remain inert, not be rewritten.
    await db.query(
      "INSERT INTO ecommerce_shipments(order_id,tracking_number,tracking_url) VALUES($1,NULL,$2),($1,'LEGACY-UNSAFE','javascript:alert(1)')",
      [id, carrierUrl],
    );
    await page.goto(`/account/orders/${id}`);
    await expect(page.getByText("LEGACY-UNSAFE", { exact: true })).toBeVisible();
    await expect(page.locator(`a[href="${carrierUrl}"]`)).toHaveCount(1);
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    expect(
      (
        await page.request.post("/api/auth/login", {
          data: { email: "browser-admin@example.test", password: "CoreBrowserTest!2026" },
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/admin/ecommerce/orders");
    await page.getByPlaceholder("Search order, customer, item, or tracking").fill(id);
    await page.getByRole("button", { name: "View", exact: true }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("link", { name: "Track package", exact: true })).toHaveAttribute(
      "href",
      carrierUrl,
    );
    await expect(drawer.getByText("LEGACY-UNSAFE", { exact: true })).toBeVisible();
    await expect(drawer.locator('a[href^="javascript:"]')).toHaveCount(0);
    const retained = await db.query(
      "SELECT tracking_url FROM ecommerce_shipments WHERE order_id=$1 AND tracking_number='LEGACY-UNSAFE'",
      [id],
    );
    expect(retained.rows[0].tracking_url).toBe("javascript:alert(1)");
  } finally {
    await db.query("DELETE FROM ecommerce_orders WHERE id=$1", [id]);
    await db.end();
  }
});
