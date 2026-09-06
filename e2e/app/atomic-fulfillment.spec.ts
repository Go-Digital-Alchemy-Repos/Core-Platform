import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import pg from "pg";
function database() {
  const value = process.env.BROWSER_TEST_DATABASE_URL;
  if (!value) throw new Error("Fixture required");
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/core_browser_test" ||
    url.search ||
    url.hash
  )
    throw new Error("Local fixture required");
  return new pg.Pool({
    connectionString: value,
    max: 1,
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
    statement_timeout: 10000,
  });
}
test("partial shipping survives committed-response loss and retry without duplicate effects", async ({
  page,
}) => {
  test.setTimeout(90000);
  const db = database();
  const id = randomUUID();
  const itemId = randomUUID();
  const alternateId = randomUUID();
  try {
    await db.query(
      "INSERT INTO ecommerce_orders(id,customer_id,status,payment_status,total_amount) VALUES($1,'browser-manual-customer','paid','paid',0)",
      [alternateId],
    );
    await db.query(
      "INSERT INTO ecommerce_orders(id,customer_id,status,payment_status,total_amount) VALUES($1,'browser-manual-customer','paid','paid',5000)",
      [id],
    );
    await db.query(
      "INSERT INTO ecommerce_order_items(id,order_id,product_id,product_name,quantity,unit_price,line_total) VALUES($1,$2,'browser-manual-product','Atomic browser item',2,2500,5000)",
      [itemId, id],
    );
    await page.goto("/auth/login");
    await page.getByTestId("input-email").fill("browser-admin@example.test");
    await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
    await page.getByTestId("button-login").click();
    await expect(page).not.toHaveURL(/auth\/login/);
    await page.goto("/admin/ecommerce/orders");
    await page.getByPlaceholder("Search order, customer, item, or tracking").fill(id);
    await page.getByRole("button", { name: "View", exact: true }).click();
    const drawer = page.getByRole("dialog");
    const quantity = drawer.getByLabel(/Atomic browser item: quantity to ship/);
    await expect(quantity).toHaveValue("2");
    await quantity.fill("1");
    await drawer.getByLabel("Shipment tracking number").fill("SYNTHETIC-ONE");
    await drawer.getByLabel("Shipment carrier").fill("UPS");
    const keys: string[] = [];
    let lost = false;
    let firstId = "";
    await page.route(`**/orders/${id}/ship-and-fulfill`, async (route) => {
      keys.push(route.request().headers()["idempotency-key"]);
      const response = await route.fetch();
      expect(response.ok(), await response.text()).toBe(true);
      const body = await response.json();
      if (!lost) {
        firstId = body.shipment.id;
        lost = true;
        await route.abort("failed");
      } else {
        expect(body.shipment.id).toBe(firstId);
        expect(body.replayed).toBe(true);
        await route.fulfill({ response });
      }
    });
    await drawer.getByRole("button", { name: "Mark shipped", exact: true }).click();
    await expect(page.getByText("Shipment could not be created", { exact: true })).toBeVisible();
    await expect(quantity).toHaveValue("1");
    await expect(drawer.getByLabel("Shipment tracking number")).toHaveValue("SYNTHETIC-ONE");
    // Moving between orders must retain the original pending request identity.
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByPlaceholder("Search order, customer, item, or tracking").fill(alternateId);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByPlaceholder("Search order, customer, item, or tracking").fill(id);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await expect(quantity).toHaveValue("1");
    // Inject the reviewed race: refresh actual server data after commit, before replay.
    await page.evaluate(async () => {
      const modulePath = "/src/lib/queryClient.ts";
      const { queryClient } = await import(modulePath);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/orders"] });
    });
    await expect(
      drawer.getByLabel(/Atomic browser item: quantity to ship \(1 remaining\)/),
    ).toBeVisible();
    await drawer.getByRole("button", { name: "Mark shipped", exact: true }).click();
    await expect(page.getByText("Shipment saved", { exact: true })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    const counts = await db.query(
      "SELECT (SELECT count(*)::int FROM ecommerce_shipments WHERE order_id=$1) AS shipments,(SELECT count(*)::int FROM ecommerce_fulfillments WHERE order_id=$1) AS fulfillments,(SELECT count(*)::int FROM ecommerce_notification_jobs WHERE order_id=$1) AS notifications",
      [id],
    );
    expect(counts.rows[0]).toEqual({ shipments: 1, fulfillments: 1, notifications: 1 });
    expect(
      (await db.query("SELECT status FROM ecommerce_orders WHERE id=$1", [id])).rows[0].status,
    ).toBe("paid");
    await page.unroute(`**/orders/${id}/ship-and-fulfill`);
    await expect(quantity).toHaveValue("1");
    await drawer.getByLabel("Shipment tracking number").fill("SYNTHETIC-TWO");
    await drawer.getByRole("button", { name: "Mark shipped", exact: true }).click();
    await expect
      .poll(async () =>
        Number(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM ecommerce_fulfillments WHERE order_id=$1",
              [id],
            )
          ).rows[0].count,
        ),
      )
      .toBe(2);
    expect(
      (await db.query("SELECT status FROM ecommerce_orders WHERE id=$1", [id])).rows[0].status,
    ).toBe("shipped");
    await page.reload();
    await page.getByPlaceholder("Search order, customer, item, or tracking").fill(id);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByLabel(/Atomic browser item: quantity to ship/)).toHaveValue("0");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await db.query("DELETE FROM ecommerce_orders WHERE id=ANY($1::varchar[])", [[id, alternateId]]);
    await db.end();
  }
});

test("atomic shipping keeps mounted authentication and ecommerce permission gates", async ({
  page,
  request,
}) => {
  const path = "/api/admin/ecommerce/orders/not-an-order/ship-and-fulfill";
  expect((await request.post(path, { data: {} })).status()).toBe(401);
  await page.goto("/auth/login");
  await page.getByTestId("input-email").fill("browser-editor@example.test");
  await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
  await page.getByTestId("button-login").click();
  await expect(page).not.toHaveURL(/auth\/login/);
  expect((await page.request.post(path, { data: {} })).status()).toBe(403);
});

test("completion for another order preserves the selected order draft", async ({ page }) => {
  test.setTimeout(90000);
  const db = database();
  const first = randomUUID(),
    second = randomUUID();
  const firstItem = randomUUID(),
    secondItem = randomUUID();
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    for (const [id, item, name] of [
      [first, firstItem, "First item"],
      [second, secondItem, "Second item"],
    ]) {
      await db.query(
        "INSERT INTO ecommerce_orders(id,customer_id,status,payment_status,total_amount) VALUES($1,'browser-manual-customer','paid','paid',5000)",
        [id],
      );
      await db.query(
        "INSERT INTO ecommerce_order_items(id,order_id,product_id,product_name,quantity,unit_price,line_total) VALUES($1,$2,'browser-manual-product',$3,2,2500,5000)",
        [item, id, name],
      );
    }
    await page.goto("/auth/login");
    await page.getByTestId("input-email").fill("browser-admin@example.test");
    await page.getByTestId("input-password").fill("CoreBrowserTest!2026");
    await page.getByTestId("button-login").click();
    await expect(page).not.toHaveURL(/auth\/login/);
    await page.goto("/admin/ecommerce/orders");
    const search = page.getByPlaceholder("Search order, customer, item, or tracking");
    await search.fill(second);
    await page.getByRole("button", { name: "View", exact: true }).click();
    let drawer = page.getByRole("dialog");
    await drawer.getByLabel(/Second item: quantity to ship/).fill("1");
    await drawer.getByLabel("Shipment tracking number").fill("KEEP-SECOND-DRAFT");
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await search.fill(first);
    await page.getByRole("button", { name: "View", exact: true }).click();
    drawer = page.getByRole("dialog");
    await drawer.getByLabel(/First item: quantity to ship/).fill("1");
    await drawer.getByLabel("Shipment tracking number").fill("FIRST-SHIPMENT");
    await page.route(`**/orders/${first}/ship-and-fulfill`, async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await held;
      await route.fulfill({ response });
    });
    await drawer.getByRole("button", { name: "Mark shipped", exact: true }).click();
    await expect
      .poll(async () =>
        Number(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM ecommerce_shipments WHERE order_id=$1",
              [first],
            )
          ).rows[0].count,
        ),
      )
      .toBe(1);
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await search.fill(second);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await expect(page.getByLabel("Shipment tracking number")).toHaveValue("KEEP-SECOND-DRAFT");
    release();
    await expect(page.getByText("Shipment saved", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Shipment tracking number")).toHaveValue("KEEP-SECOND-DRAFT");
    await expect(page.getByLabel(/Second item: quantity to ship/)).toHaveValue("1");
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
    await db.query("DELETE FROM ecommerce_orders WHERE id=ANY($1::varchar[])", [[first, second]]);
    await db.end();
  }
});
