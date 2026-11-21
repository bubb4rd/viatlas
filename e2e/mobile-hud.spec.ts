import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

test("HUD controls fit a 375 px phone with 44 px targets", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  const controls = page
    .getByRole("button")
    .or(page.getByRole("combobox", { name: "Search POIs" }));
  await expect(controls.first()).toBeVisible();

  const boxes: Box[] = [];
  for (const control of await controls.all()) {
    // Next's dev-only indicator is not part of the HUD.
    if (!(await control.isVisible())) continue;
    const name =
      (await control.getAttribute("aria-label")) ??
      (await control.innerText()).trim();
    if (/next\.js/i.test(name)) continue;
    const box = await control.boundingBox();
    if (box) boxes.push({ name, ...box });
  }
  expect(boxes.length).toBeGreaterThanOrEqual(7);

  for (const box of boxes) {
    expect.soft(box.width, `${box.name} width`).toBeGreaterThanOrEqual(44);
    expect.soft(box.height, `${box.name} height`).toBeGreaterThanOrEqual(44);
    expect.soft(box.x, `${box.name} left`).toBeGreaterThanOrEqual(0);
    expect
      .soft(box.x + box.width, `${box.name} right`)
      .toBeLessThanOrEqual(375);
  }
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      expect.soft(overlaps(a, b), `${a.name} overlaps ${b.name}`).toBe(false);
    }
  }
});
