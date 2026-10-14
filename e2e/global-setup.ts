import fs from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { MockHAWebSocketServer } from "./mocks/mock-ha-websocket-server";

const MOCK_CONFIG_DIR = path.join(process.cwd(), ".e2e-mock");
const MOCK_HA_DIR = path.join(MOCK_CONFIG_DIR, "homeassistant");
const MOCK_DATA_DIR = path.join(MOCK_CONFIG_DIR, "data");

let mockServer: MockHAWebSocketServer | null = null;

async function globalSetup(_config: FullConfig) {
	console.log("\n[E2E Setup] Starting global setup...");

	// Create mock directories
	await fs.mkdir(MOCK_HA_DIR, { recursive: true });
	await fs.mkdir(MOCK_DATA_DIR, { recursive: true });

	// Create mock configuration.yaml
	const configYaml = `
# Test comment that must survive
homeassistant:
  name: Test Home
  customize: !include customize.yaml

alexa:
  smart_home:
    filter:
      include_entities:
        - light.living_room_ceiling
`;
	await fs.writeFile(path.join(MOCK_HA_DIR, "configuration.yaml"), configYaml);

	// Create mock options.json
	const options = {
		ha_websocket_url: "ws://localhost:8765",
		ha_access_token: "test-token",
		ha_entity_domains: [
			"switch",
			"scene",
			"sensor",
			"binary_sensor",
			"light",
			"climate",
			"button",
			"automation",
		],
	};
	await fs.writeFile(
		path.join(MOCK_DATA_DIR, "options.json"),
		JSON.stringify(options, null, 2),
	);

	// Set environment variables
	process.env.HA_CONF_PATH = MOCK_CONFIG_DIR + "/";
	process.env.HA_WEBSOCKET_URL = "ws://localhost:8765";
	process.env.SUPERVISOR_TOKEN = "test-token";

	// Start mock WebSocket server
	mockServer = new MockHAWebSocketServer({
		port: 8765,
		authToken: "test-token",
	});

	await mockServer.start();
	console.log("[E2E Setup] Mock server started");

	// Store server reference for teardown
	(globalThis as Record<string, unknown>).__mockServer = mockServer;
	(globalThis as Record<string, unknown>).__mockConfigDir = MOCK_CONFIG_DIR;

	console.log("[E2E Setup] Global setup complete\n");
}

export default globalSetup;
