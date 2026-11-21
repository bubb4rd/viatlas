import { expect, type Page, test } from "@playwright/test";

// Fixture, not real data: no reviewed POIs ship yet (see src/features/pois/data.ts).
const FIXTURE_POI = {
  id: "poi-e2e-fixture",
  name: "E2E Fixture POI",
  category: "landmark",
  position: [1500, -2500],
  source: {
    kind: "trailer",
    ref: "E2E fixture, not real data",
    addedBy: "e2e",
  },
  confidence: "likely",
};

// Centers the camera on the fixture, so the marker sits mid-viewport.
const FIXTURE_URL = "/#map=15.00/1500/-2500";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((poi) => {
    Object.assign(globalThis, {
      __VIATLAS_E2E_POIS__: {
        landmark: [poi],
        business: [],
        activity: [],
        transport: [],
        nature: [],
      },
    });
  }, FIXTURE_POI);
});

/** Waits until deck.gl renders frames: it sets the canvas cursor each frame. */
async function gotoMap(page: Page) {
  await page.goto(FIXTURE_URL);
  await expect(page.locator("canvas").first()).toHaveCSS("cursor", "grab");
}

async function expectFixtureSelected(page: Page) {
  await expect(page).toHaveURL(/&poi=poi-e2e-fixture$/);
  await expect(
    page.getByRole("dialog", { name: FIXTURE_POI.name }),
  ).toBeVisible();
}

// Regression for #42: the first pointer interaction after load must select,
// with no hover pick before it.
test("first click on a marker selects it", async ({ page }) => {
  await gotoMap(page);
  const size = page.viewportSize();
  if (!size) throw new Error("no viewport");

  await page.mouse.click(size.width / 2, size.height / 2);
  await expectFixtureSelected(page);
});

test.describe("touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("first tap on a marker selects it", async ({ page }) => {
    await gotoMap(page);

    await page.touchscreen.tap(195, 422);
    await expectFixtureSelected(page);
  });
});
