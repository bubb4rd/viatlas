import { expect, test } from "@playwright/test";

test("map renders and switches camera mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  const threeD = page.getByRole("button", { name: "3D" });
  await threeD.click();
  await expect(threeD).toHaveAttribute("aria-pressed", "true");

  expect(errors).toEqual([]);
});

test("camera survives a reload through the URL hash", async ({ page }) => {
  await page.goto("/#map=13.00/1500/-2500");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByRole("button", { name: "3D" }).click();
  // Written once the mode transition settles: zoom/x/y/pitch/bearing.
  await expect(page).toHaveURL(/#map=13\.00\/1500\/-2500\/50\/-20$/);

  await page.reload();
  await expect(page.getByRole("button", { name: "3D" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("intel layers popover opens, toggles filters, and closes on Escape", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  const trigger = page.getByRole("button", { name: /layers/i });
  await trigger.click();

  const landmarks = page.getByRole("switch", { name: /landmarks/i });
  await expect(landmarks).toHaveAttribute("aria-checked", "true");
  await landmarks.click();
  await expect(landmarks).toHaveAttribute("aria-checked", "false");
  await expect(trigger).toContainText("4/5");

  await page.keyboard.press("Escape");
  await expect(landmarks).toBeHidden();
});

test("HUD buttons zoom and reset the camera", async ({ page }) => {
  await page.goto("/#map=13.00/1500/-2500");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page).toHaveURL(/#map=14\.00\/1500\/-2500$/);

  await page.getByRole("button", { name: "Zoom out" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#map=13\.00\/1500\/-2500$/);

  await page.getByRole("button", { name: "Reset view to north" }).click();
  await expect(page).toHaveURL(/#map=11\.50\/0\/0$/);
});
