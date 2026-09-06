import { expect, test } from "@playwright/test";

test("security auxiliary reads fail visibly, retry and retain acknowledged data", async ({
  page,
}) => {
  test.setTimeout(60000);
  const loggedIn = await page.request.post("/api/auth/login", {
    data: { email: "browser-admin@example.test", password: "CoreBrowserTest!2026" },
  });
  expect(loggedIn.ok()).toBe(true);
  const created = await page.request.post("/api/admin/ecommerce/security/blocks", {
    data: {
      type: "email",
      value: "synthetic-block@example.test",
      reason: "Browser retained-data fixture",
    },
  });
  expect(created.status()).toBe(201);
  const block = await created.json();
  let fail = true;
  await page.route("**/api/admin/ecommerce/security/overview", (route) =>
    fail ? route.abort("failed") : route.continue(),
  );
  await page.route("**/api/admin/ecommerce/security/blocks", (route) =>
    fail ? route.abort("failed") : route.continue(),
  );
  try {
    await page.goto("/admin/ecommerce/settings/security");
    await expect(
      page.getByText("Security activity could not be loaded.", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Manual fraud blocks could not be loaded.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No active manual fraud blocks.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Screened today", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save Security Center", exact: true }),
    ).toBeEnabled();
    fail = false;
    await page.getByRole("button", { name: "Retry security activity", exact: true }).click();
    await page.getByRole("button", { name: "Retry manual fraud blocks", exact: true }).click();
    await expect(page.getByText("synthetic-block@example.test", { exact: true })).toBeVisible();
    await expect(page.getByText("Screened today", { exact: true })).toBeVisible();
    fail = true;
    await page.evaluate(async () => {
      const path = "/src/lib/queryClient.ts";
      const { queryClient } = await import(/* @vite-ignore */ path);
      void Promise.all(
        ["overview", "blocks"].map((section) =>
          queryClient.invalidateQueries({ queryKey: [`/api/admin/ecommerce/security/${section}`] }),
        ),
      );
    });
    await expect(
      page.getByText("Security activity could not be refreshed. Showing previously loaded data.", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        "Manual fraud blocks could not be refreshed. Showing previously loaded data.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByText("synthetic-block@example.test", { exact: true })).toBeVisible();
    await expect(page.getByText("Screened today", { exact: true })).toBeVisible();
  } finally {
    expect(
      (await page.request.delete(`/api/admin/ecommerce/security/blocks/${block.id}`)).ok(),
    ).toBe(true);
  }
});
