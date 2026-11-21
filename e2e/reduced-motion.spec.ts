import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

// Under reduced motion the camera jumps; each jump must still update the
// camera the next move starts from, and the URL.
test("reduced motion jumps the camera and keeps it in sync", async ({
  page,
}) => {
  await page.goto("/#map=11.50/0/0");
  await expect(page.locator("canvas").first()).toBeVisible();

  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  await zoomIn.click();
  await zoomIn.click();
  await expect(page).toHaveURL(/#map=13\.50\/0\/0$/);

  await page.getByRole("button", { name: "3D" }).click();
  await expect(page).toHaveURL(/#map=13\.50\/0\/0\/50\/-20$/);
});
