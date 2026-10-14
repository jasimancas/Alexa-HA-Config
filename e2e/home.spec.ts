import path from "node:path";
import { expect, test } from "@playwright/test";

// Helper to wait for toast to disappear
async function waitForToastToDismiss(page: import("@playwright/test").Page) {
	// Wait for toast to appear and then disappear
	try {
		await page.waitForSelector('[data-rht-toaster]', { state: 'hidden', timeout: 5000 });
	} catch {
		// Toast might not appear, continue
	}
}

test.describe("Home Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should display the page title", async ({ page }) => {
		await expect(page).toHaveTitle("Devices");
	});

	test("should display the main heading", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible();
	});

	test("should display the subtitle", async ({ page }) => {
		await expect(
			page.getByText("Select devices to share with Alexa", { exact: true }),
		).toBeVisible();
	});

	test("should display the Reload Devices button", async ({ page }) => {
		await expect(
			page.getByRole("button", { name: /Reload Devices/i }),
		).toBeVisible();
	});

	test("should display the Publish Changes button", async ({ page }) => {
		await expect(
			page.getByRole("button", { name: /Publish Changes/i }),
		).toBeVisible();
	});

	test("should display filter tabs", async ({ page }) => {
		// Material Tailwind tabs - use text content instead of role
		await expect(page.getByText("All").first()).toBeVisible();
		await expect(page.getByText("Synced").first()).toBeVisible();
		await expect(page.getByText("Unsynced")).toBeVisible();
	});

	test("should display search input", async ({ page }) => {
		await expect(page.getByRole("textbox")).toBeVisible();
	});

	test("should display pagination controls", async ({ page }) => {
		// Wait for table to load first
		await page.waitForSelector("table", { timeout: 10000 });

		await expect(page.getByText("Previous")).toBeVisible();
		await expect(page.getByText("Next")).toBeVisible();
	});
});

test.describe("Entity Loading", () => {
	test("should load and display entities from Home Assistant", async ({
		page,
	}) => {
		await page.goto("/");

		// Wait for entities to load - look for success toast or table content
		await page.waitForSelector("table", { timeout: 10000 });

		// Check that the table has content
		const table = page.locator("table");
		await expect(table).toBeVisible();

		// Check for device data from our mock (table shows device names, not entity names)
		await expect(
			page.getByText("Philips Hue Bridge").last(),
		).toBeVisible({ timeout: 10000 });
	});

	test("should display device information", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Check for device name from mock data
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible({
			timeout: 10000,
		});
	});

	test("should display manufacturer information", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Check for manufacturer from mock data
		await expect(page.getByText("Philips").last()).toBeVisible({
			timeout: 10000,
		});
	});
});

test.describe("Search Functionality", () => {
	test("should filter entities by search term", async ({ page }) => {
		await page.goto("/");

		// Wait for entities to load
		await page.waitForSelector("table", { timeout: 10000 });
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible({
			timeout: 10000,
		});

		// Search for "Smart Plug" (device name for coffee maker switch)
		const searchInput = page.getByRole("textbox");
		await searchInput.fill("Smart Plug");

		// Should show Smart Plug device
		await expect(page.getByText("Smart Plug").last()).toBeVisible();

		// Should not show Philips Hue Bridge
		await expect(page.getByText("Philips Hue Bridge")).not.toBeVisible();
	});

	test("should filter by entity ID", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		const searchInput = page.getByRole("textbox");
		await searchInput.fill("climate.thermostat");

		// Should show Smart Thermostat device (for climate.thermostat entity)
		await expect(page.getByText("Smart Thermostat").last()).toBeVisible();
	});

	test("should filter by manufacturer", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		const searchInput = page.getByRole("textbox");
		await searchInput.fill("Ecobee");

		await expect(page.getByText("Smart Thermostat").last()).toBeVisible();
	});
});

test.describe("Tab Filtering", () => {
	test("should filter synced entities when Synced tab is clicked", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Click on the Synced tab - find by text within tablist
		const tabList = page.locator('[role="tablist"]');
		const syncedTab = tabList.getByText("Synced").first();
		await syncedTab.click({ force: true });

		// Only synced entities should be visible
		// Based on our mock config, light.living_room_ceiling is synced (device: Philips Hue Bridge)
		await expect(
			page.getByText("Philips Hue Bridge").last(),
		).toBeVisible();
	});

	test("should filter unsynced entities when Unsynced tab is clicked", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Click on the Unsynced tab
		const tabList = page.locator('[role="tablist"]');
		const unsyncedTab = tabList.getByText("Unsynced");
		await unsyncedTab.click({ force: true });

		// Unsynced entities should be visible (Smart Plug is device for coffee maker switch)
		await expect(page.getByText("Smart Plug").last()).toBeVisible();
	});

	test("should show all entities when All tab is clicked", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		const tabList = page.locator('[role="tablist"]');

		// First click on Synced tab
		await tabList.getByText("Synced").first().click({ force: true });
		await page.waitForTimeout(500);

		// Then click on All tab
		await tabList.getByText("All").click({ force: true });

		// All entities should be visible (device names)
		await expect(
			page.getByText("Philips Hue Bridge").last(),
		).toBeVisible();
		await expect(page.getByText("Smart Plug").last()).toBeVisible();
	});
});

test.describe("Sync Toggle", () => {
	test("should toggle entity sync status", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Find the switch container and click on it (Material Tailwind switch)
		// The actual input is hidden, we need to click the visible switch element
		const switchContainers = page.locator('table tbody input[type="checkbox"]');
		const firstSwitch = switchContainers.first();

		// Get initial state
		const wasChecked = await firstSwitch.isChecked();

		// Toggle the switch using force click to bypass overlay
		await firstSwitch.click({ force: true });

		// Verify state changed
		if (wasChecked) {
			await expect(firstSwitch).not.toBeChecked();
		} else {
			await expect(firstSwitch).toBeChecked();
		}
	});
});

test.describe("Pagination", () => {
	test("should show page information", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Should show page info
		await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();
	});

	test("should have Previous button disabled on first page", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		const prevButton = page.getByRole("button", { name: /Previous/i });
		await expect(prevButton).toBeDisabled();
	});
});

test.describe("Publish Changes", () => {
	test("should open confirmation dialog when Publish Changes is clicked", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await page.getByRole("button", { name: "Share all shown", exact: true }).click();

		// Click Publish Changes button
		const publishButton = page.getByRole("button", {
			name: /Publish Changes/i,
		});
		await publishButton.click();

		// Should show confirmation dialog
		await expect(page.getByText("Publish Changes to Alexa?")).toBeVisible();
	});

	test("should close dialog when Cancel is clicked", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await page.getByRole("button", { name: "Share all shown", exact: true }).click();

		// Open dialog
		await page.getByRole("button", { name: /Publish Changes/i }).click();
		await expect(page.getByText("Publish Changes to Alexa?")).toBeVisible();

		// Click Cancel
		await page.getByRole("button", { name: /Cancel/i }).click();

		// Dialog should close
		await expect(
			page.getByText("Publish Changes to Alexa?"),
		).not.toBeVisible();
	});

	test("should show entity count in confirmation dialog", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await page.getByRole("button", { name: "Share all shown", exact: true }).click();

		// Open dialog
		await page.getByRole("button", { name: /Publish Changes/i }).click();

		// Should show entity count message
		await expect(page.getByText(/\d+ entit(y|ies)/)).toBeVisible();
	});
});

test.describe("Publish end-to-end", () => {
	test("is disabled until something changes", async ({ page }) => {
		await page.goto("/");
		await page.waitForSelector("table", { timeout: 10000 });

		const publish = page.getByRole("button", { name: /Publish Changes/i });
		await expect(publish).toBeDisabled();

		await page.getByRole("button", { name: "Share all shown", exact: true }).click();
		await expect(publish).toBeEnabled();
		await expect(page.getByTestId("pending-changes")).toBeVisible();

		await page.getByRole("button", { name: "Discard" }).click();
		await expect(publish).toBeDisabled();
	});

	test("writes the selection keeping the rest of configuration.yaml", async ({
		page,
	}) => {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const configPath = path.join(
			process.cwd(),
			".e2e-mock/homeassistant/configuration.yaml",
		);
		const before = await fs.readFile(configPath, "utf-8");

		try {
			await page.goto("/");
			await page.waitForSelector("table", { timeout: 10000 });
			await page.getByRole("button", { name: "Share all shown", exact: true }).click();
			await page.getByRole("button", { name: /Publish Changes/i }).click();
			await page.getByRole("button", { name: "Publish", exact: true }).click();

			await expect(page.getByText("Restart Home Assistant?")).toBeVisible();
			await page.getByRole("button", { name: "Later" }).click();
			await expect(page.getByTestId("pending-changes")).toHaveCount(0);

			const after = await fs.readFile(configPath, "utf-8");
			expect(after).toContain("# Test comment that must survive");
			expect(after).toContain("customize: !include customize.yaml");
			expect(after).toContain("- switch.");
		} finally {
			await fs.writeFile(configPath, before);
		}
	});
});

test.describe("Reload Devices", () => {
	test("should reload devices when Reload button is clicked", async ({
		page,
	}) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Click Reload Devices button
		const reloadButton = page.getByRole("button", { name: /Reload Devices/i });
		await reloadButton.click();

		// Should show success toast
		await expect(page.getByText(/Devices reloaded/i)).toBeVisible({
			timeout: 5000,
		});
	});
});

test.describe("Sorting", () => {
	test("should have sortable column headers", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Check that sort buttons exist in the table header
		const sortButtons = page.locator("table thead button");
		const count = await sortButtons.count();
		expect(count).toBeGreaterThan(0);
	});

	test("should sort when clicking a sort button", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Get the first sort button and click it
		const sortButtons = page.locator("table thead button");
		const firstSortButton = sortButtons.first();
		await firstSortButton.click();

		// Table should still be visible (no errors)
		await expect(page.locator("table")).toBeVisible();
	});
});

test.describe("Dropdown Filters", () => {
	test("should display dropdown filter buttons", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// Should have two "All" buttons for the dropdown filters (plus the tab)
		const allButtons = page.locator("button").filter({ hasText: "All" });
		const count = await allButtons.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test("should filter by domain using dropdown", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Initially multiple device types should be visible
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible();
		await expect(page.getByText("Smart Plug").last()).toBeVisible();

		// Click the first "All" dropdown button (primary filter)
		const primaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await primaryDropdown.click();

		// Select "Domain" from the menu
		await page.getByRole("menuitem", { name: "Domain" }).click();

		// Click the secondary dropdown (now shows "All")
		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await secondaryDropdown.click();

		// Select "Light" domain from menu
		await page.getByRole("menuitem", { name: "Light" }).click();

		// Should show light entities (Philips Hue Bridge is the device for lights)
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible();

		// Should not show switch entities (Smart Plug is device for switches)
		await expect(page.getByText("Smart Plug")).toHaveCount(0);
	});

	test("should filter by area using dropdown", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Click the primary dropdown
		const primaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await primaryDropdown.click();

		// Select "Area" from the menu
		await page.getByRole("menuitem", { name: "Area" }).click();

		// Click the secondary dropdown
		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await secondaryDropdown.click();

		// Select "Kitchen" area from menu
		await page.getByRole("menuitem", { name: "Kitchen" }).click();

		// Should show kitchen entities (Smart Plug for coffee maker, Philips Hue Bridge for under cabinet light)
		await expect(page.getByText("Smart Plug").last()).toBeVisible();

		// Should not show hallway entities (Smart Thermostat is in hallway)
		await expect(page.getByText("Smart Thermostat")).not.toBeVisible();
	});

	test("should filter by manufacturer using dropdown", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Click the primary dropdown
		const primaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await primaryDropdown.click();

		// Select "Manufacturer" from the menu
		await page.getByRole("menuitem", { name: "Manufacturer" }).click();

		// Click the secondary dropdown
		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await secondaryDropdown.click();

		// Select "Ecobee" manufacturer from menu
		await page.getByRole("menuitem", { name: "Ecobee" }).click();

		// Should show Ecobee entities (Smart Thermostat device)
		await expect(page.getByText("Smart Thermostat").last()).toBeVisible();

		// Should not show Philips entities
		await expect(page.getByText("Philips Hue Bridge")).not.toBeVisible();
	});

	test("should reset filter when selecting All in primary dropdown", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// First apply a filter
		const primaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await primaryDropdown.click();
		await page.getByRole("menuitem", { name: "Domain" }).click();

		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await secondaryDropdown.click();
		await page.getByRole("menuitem", { name: "Light" }).click();

		// Verify filter is applied - Smart Plug (switch device) should not be visible
		await expect(page.getByText("Smart Plug")).toHaveCount(0);

		// Now reset by clicking the Domain button and selecting All
		const domainButton = page.locator("button").filter({ hasText: "Domain" }).first();
		await domainButton.click();
		await page.getByRole("menuitem", { name: "All" }).click();

		// All entities should be visible again
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible();
		await expect(page.getByText("Smart Plug").last()).toBeVisible();
	});

	test("should disable secondary dropdown when no primary selection", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });

		// The secondary dropdown should be disabled initially
		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).nth(1);
		await expect(secondaryDropdown).toBeDisabled();
	});

	test("should combine dropdown filter with search", async ({ page }) => {
		await page.goto("/");

		await page.waitForSelector("table", { timeout: 10000 });
		await waitForToastToDismiss(page);

		// Apply domain filter for "Light"
		const primaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await primaryDropdown.click();
		await page.getByRole("menuitem", { name: "Domain" }).click();

		const secondaryDropdown = page.locator("button").filter({ hasText: "All" }).first();
		await secondaryDropdown.click();
		await page.getByRole("menuitem", { name: "Light" }).click();

		// Now also search for "kitchen" (to find kitchen_under_cabinet light)
		const searchInput = page.getByRole("textbox");
		await searchInput.fill("kitchen");

		// Should show Philips Hue Bridge (device for kitchen under cabinet light)
		await expect(page.getByText("Philips Hue Bridge").last()).toBeVisible();

		// Verify entity ID is visible for the kitchen light
		await expect(page.getByText("light.kitchen_under_cabinet").last()).toBeVisible();
	});
});

test.describe("Alexa entity settings", () => {
	const configPath = () =>
		path.join(process.cwd(), ".e2e-mock/homeassistant/configuration.yaml");

	test("shows compatibility and edits the spoken name", async ({ page }) => {
		const fs = await import("node:fs/promises");
		const before = await fs.readFile(configPath(), "utf-8");
		try {
			await page.goto("/");
			await page.waitForSelector("table", { timeout: 10000 });

			// Capabilities come from the entity state
			await expect(
				page.getByText("On/off, Brightness, Color temperature, Color").first(),
			).toBeVisible();

			await page
				.getByRole("button", {
					name: "Edit Alexa settings for light.living_room_lamp",
				})
				.click();
			await page.getByLabel("Spoken name").fill("Lámpara de pie");
			await page.getByLabel("Device type").selectOption("LIGHT");
			await page.getByRole("button", { name: "Apply" }).click();

			await expect(page.getByText("“Lámpara de pie”").first()).toBeVisible();
			await expect(page.getByTestId("pending-changes")).toContainText("1 edited");

			await page.getByRole("button", { name: /Publish Changes/i }).click();
			await page.getByRole("button", { name: "Publish", exact: true }).click();
			await page.getByRole("button", { name: "Later" }).click();

			const after = await fs.readFile(configPath(), "utf-8");
			expect(after).toContain("light.living_room_lamp:");
			expect(after).toContain("name: Lámpara de pie");
			expect(after).toContain("display_categories: LIGHT");
		} finally {
			await fs.writeFile(configPath(), before);
		}
	});

	test("migrates plain-text credentials to secrets.yaml", async ({ page }) => {
		const fs = await import("node:fs/promises");
		const before = await fs.readFile(configPath(), "utf-8");
		const secretsPath = path.join(path.dirname(configPath()), "secrets.yaml");
		await fs.writeFile(
			configPath(),
			before.replace("  smart_home:\n", "  smart_home:\n    client_id: amzn1.e2e\n"),
		);
		try {
			await page.goto("/");
			const banner = page
				.getByRole("alert")
				.filter({ hasText: "stored in plain text" });
			await expect(banner).toBeVisible();
			await banner
				.getByRole("button", { name: "Migrate to secrets.yaml" })
				.click();
			await expect(banner).toHaveCount(0);

			expect(await fs.readFile(configPath(), "utf-8")).toContain(
				"client_id: !secret alexa_client_id",
			);
			expect(await fs.readFile(secretsPath, "utf-8")).toContain(
				"alexa_client_id: amzn1.e2e",
			);
		} finally {
			await fs.writeFile(configPath(), before);
			await fs.rm(secretsPath, { force: true });
		}
	});
});

