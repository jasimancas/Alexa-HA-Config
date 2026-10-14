import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["html"], ["list"]],
	globalSetup: "./e2e/global-setup.ts",
	globalTeardown: "./e2e/global-teardown.ts",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command:
			"HA_CONF_PATH=.e2e-mock/ HA_WEBSOCKET_URL=ws://localhost:8765 SUPERVISOR_TOKEN=test-token pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		env: {
			HA_CONF_PATH: ".e2e-mock/",
			HA_WEBSOCKET_URL: "ws://localhost:8765",
			SUPERVISOR_TOKEN: "test-token",
		},
	},
});
