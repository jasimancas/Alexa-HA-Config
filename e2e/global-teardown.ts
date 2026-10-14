import fs from "node:fs/promises";
import type { FullConfig } from "@playwright/test";
import type { MockHAWebSocketServer } from "./mocks/mock-ha-websocket-server";

async function globalTeardown(_config: FullConfig) {
	console.log("\n[E2E Teardown] Starting global teardown...");

	// Stop mock server
	const mockServer = (globalThis as Record<string, unknown>)
		.__mockServer as MockHAWebSocketServer | null;
	if (mockServer) {
		await mockServer.stop();
		console.log("[E2E Teardown] Mock server stopped");
	}

	// Clean up mock config directory
	const mockConfigDir = (globalThis as Record<string, unknown>)
		.__mockConfigDir as string | undefined;
	if (mockConfigDir) {
		try {
			await fs.rm(mockConfigDir, { recursive: true, force: true });
			console.log("[E2E Teardown] Mock config directory cleaned up");
		} catch {
			// Ignore cleanup errors
		}
	}

	console.log("[E2E Teardown] Global teardown complete\n");
}

export default globalTeardown;
