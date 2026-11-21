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

test("POI filters and selection round-trip through the URL hash", async ({
  page,
}) => {
  // No reviewed POIs ship yet, so this id is unknown and dropped on load.
  await page.goto(
    "/#map=13.00/1500/-2500&hide=business,nature&speculative=1&poi=poi-not-in-data",
  );
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page).toHaveURL(
    /#map=13\.00\/1500\/-2500&hide=business,nature&speculative=1$/,
  );

  const trigger = page.getByRole("button", { name: /layers/i });
  await expect(trigger).toContainText("3/5");
  await trigger.click();
  const speculative = page.getByRole("switch", { name: /speculative/i });
  await expect(
    page.getByRole("switch", { name: /businesses/i }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(speculative).toHaveAttribute("aria-checked", "true");

  await page.getByRole("switch", { name: /landmarks/i }).click();
  await expect(page).toHaveURL(/&hide=landmark,business,nature&/);

  await page.evaluate(() => {
    window.location.hash = "map=13.00/1500/-2500";
  });
  await expect(trigger).toContainText("5/5");
  await expect(speculative).toHaveAttribute("aria-checked", "false");
});

test("POI list panel toggles from the keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  const toggle = page.getByRole("button", { name: /poi list/i });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  // No reviewed POIs ship yet, so the panel shows its empty state.
  const panel = page.getByRole("region", { name: "Points of interest" });
  await expect(panel).toContainText(/no pois to show/i);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("search focuses on / and explains an empty result", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  const search = page.getByRole("combobox", { name: "Search POIs" });
  await page.keyboard.press("/");
  await expect(search).toBeFocused();

  // Typing / inside the field types it rather than re-triggering the shortcut.
  await page.keyboard.type("zz/zz");
  await expect(search).toHaveValue("zz/zz");
  await expect(page.getByRole("status")).toContainText("No matches");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("search flies to and selects the picked POI", async ({ page }) => {
  // Fixture, not real data: no reviewed POIs ship yet (see src/features/pois/data.ts).
  const poi = {
    id: "poi-e2e-search-fixture",
    name: "E2E Search Fixture",
    category: "landmark",
    position: [1500, -2500],
    source: {
      kind: "trailer",
      ref: "E2E fixture, not real data",
      addedBy: "e2e",
    },
    confidence: "likely",
  };
  await page.addInitScript((landmark) => {
    Object.assign(globalThis, {
      __VIATLAS_E2E_POIS__: {
        landmark: [landmark],
        business: [],
        activity: [],
        transport: [],
        nature: [],
      },
    });
  }, poi);

  await page.goto("/#map=11.50/0/0");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.keyboard.press("/");
  await page.keyboard.type("search fixture");
  await page.getByRole("option", { name: poi.name }).click();

  const sheet = page.getByRole("dialog", { name: poi.name });
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(
    /#map=15\.00\/1500\/-2500&poi=poi-e2e-search-fixture$/,
  );

  // Picking moves focus into the sheet. Going back to the search, which still
  // holds the pick, Escape clears it without also closing the sheet.
  const search = page.getByRole("combobox", { name: "Search POIs" });
  await expect(search).not.toBeFocused();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue(poi.name);
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(/&poi=poi-e2e-search-fixture$/);
});

test("failed base map tiles show a banner that retries and dismisses", async ({
  page,
}) => {
  let failing = true;
  const failedUrls = new Set<string>();
  await page.route("**/tiles/v1/**", (route) => {
    if (failing) failedUrls.add(route.request().url());
    return route.fulfill({ status: failing ? 503 : 404 });
  });
  await page.goto("/");

  const banner = page.getByRole("alert").filter({ hasText: "tiles failed" });
  await expect(banner).toBeVisible();
  // The map stays interactive underneath. Let the camera settle so every tile
  // the new view wants has been requested (and failed) before retrying.
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page).toHaveURL(/#map=12\.50\//);

  // Retry refetches a tile that failed; this time it comes back empty.
  failing = false;
  const retried = page.waitForResponse(
    (response) => failedUrls.has(response.url()) && response.status() === 404,
  );
  await banner.getByRole("button", { name: "Retry" }).click();
  await retried;
  await expect(banner).toBeHidden();

  // A new zoom level requests uncached tiles, so a fresh failure reopens it.
  failing = true;
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Dismiss tile error" }).click();
  await expect(banner).toBeHidden();

  // Dismiss sticks: failures on the next zoom level don't reopen it. Wait for
  // the app's error handler, then two frames so React has committed.
  const failedAgain = page.waitForEvent("console", (message) =>
    message.text().includes("Base map tile failed to load"),
  );
  await page.getByRole("button", { name: "Zoom in" }).click();
  await failedAgain;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(banner).toBeHidden();
});
