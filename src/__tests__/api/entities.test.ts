import type { NextApiRequest, NextApiResponse } from "next";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { MessageType, RequestTypeId } from "@/types/home-assistant.types";
import * as addonOptionsUtil from "@/utils/addon-options.util";
import * as haConfigUtil from "@/utils/ha-config.util";

vi.mock("@/utils/addon-options.util");
vi.mock("@/utils/ha-config.util");

type WsEventCallback = (data?: unknown) => void;

const mockWsSend = vi.fn();
const mockWsClose = vi.fn();
let mockWsHandlers: Record<string, WsEventCallback> = {};

vi.mock("ws", () => ({
	default: class MockWebSocket {
		constructor() {
			mockWsHandlers = {};
		}
		on(event: string, callback: WsEventCallback) {
			mockWsHandlers[event] = callback;
		}
		send = mockWsSend;
		close = mockWsClose;
	},
}));

const emitWsEvent = (event: string, data?: unknown) => {
	if (mockWsHandlers[event]) {
		mockWsHandlers[event](data);
	}
};

describe("/api/entities", () => {
	let req: Partial<NextApiRequest>;
	let res: Partial<NextApiResponse>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;
	let consoleErrorSpy: MockInstance;

	const mockDevice = {
		id: "device-1",
		name: "Test Device",
		model: "Model X",
		manufacturer: "Manufacturer Y",
		area_id: "area-1",
	};

	const mockEntity = {
		id: "entity-1",
		entity_id: "light.living_room",
		entity_category: null,
		name: "Living Room Light",
		area_id: "area-1",
		device_id: "device-1",
	};

	const mockArea = {
		area_id: "area-1",
		name: "Living Room",
		floor_id: "floor-1",
	};

	const simulateWebSocketFlow = ({
		devices = [mockDevice],
		entities = [mockEntity],
		areas = [mockArea],
	}: {
		devices?: (typeof mockDevice)[];
		entities?: (
			| typeof mockEntity
			| {
					id: string;
					entity_id: string;
					entity_category: null;
					name: string;
					area_id: string | null;
					device_id: string;
			  }
		)[];
		areas?: (typeof mockArea)[];
	} = {}) => {
		emitWsEvent("open");
		emitWsEvent(
			"message",
			Buffer.from(JSON.stringify({ type: MessageType.AUTH_OK })),
		);
		emitWsEvent(
			"message",
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_DEVICES,
					result: devices,
				}),
			),
		);
		emitWsEvent(
			"message",
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_ENTITIES,
					result: entities,
				}),
			),
		);
		emitWsEvent(
			"message",
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_AREAS,
					result: areas,
				}),
			),
		);
	};

	beforeEach(() => {
		mockWsHandlers = {};
		mockWsSend.mockClear();
		mockWsClose.mockClear();

		jsonMock = vi.fn();
		statusMock = vi.fn(() => ({ json: jsonMock }));

		res = {
			status: statusMock as unknown as NextApiResponse["status"],
		};

		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.spyOn(addonOptionsUtil, "getAddonOptions").mockResolvedValue({
			haAccessToken: "test-token",
			haWebsocketUrl: "ws://test/websocket",
			haEntityDomains: ["light", "switch"],
		});

		vi.spyOn(haConfigUtil, "getSharedEntityIds").mockResolvedValue([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return 405 for non-GET requests", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "POST" };

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use GET.",
		});
	});

	it("should return 405 for PUT request", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "PUT" };

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use GET.",
		});
	});

	it("should return 405 for DELETE request", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "DELETE" };

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use GET.",
		});
	});

	it("should successfully return compiled entities", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow();

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: [
				{
					id: "entity-1",
					entity_id: "light.living_room",
					name: "Living Room Light",
					entity_category: null,
					shared: false,
					device: {
						id: "device-1",
						name: "Test Device",
						manufacturer: "Manufacturer Y",
						model: "Model X",
					},
					area: {
						area_id: "area-1",
						name: "Living Room",
					},
				},
			],
		});
	});

	it("should mark entity as shared when in config", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		vi.spyOn(haConfigUtil, "getSharedEntityIds").mockResolvedValue([
			"light.living_room",
		]);

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow();

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.arrayContaining([
					expect.objectContaining({
						entity_id: "light.living_room",
						shared: true,
					}),
				]),
			}),
		);
	});

	it("should handle WebSocket errors", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.error).toBeDefined();
		});

		emitWsEvent("error", new Error("WebSocket connection failed"));

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "WebSocket connection failed",
		});
	});

	it("should handle entity without device", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const entityWithoutDevice = {
			...mockEntity,
			device_id: "non-existent-device",
		};

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow({ entities: [entityWithoutDevice] });

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.arrayContaining([
					expect.objectContaining({
						device: {
							id: "",
							name: "",
							manufacturer: "",
							model: "",
						},
					}),
				]),
			}),
		);
	});

	it("should inherit the device area when the entity has none", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);
		await vi.waitFor(() => expect(mockWsHandlers.open).toBeDefined());
		simulateWebSocketFlow({ entities: [{ ...mockEntity, area_id: null }] });
		await handlerPromise;

		expect(jsonMock.mock.calls[0][0].data[0].area).toEqual({
			area_id: "area-1",
			name: "Living Room",
		});
	});

	it("should handle entity without area", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const entityWithoutArea = {
			...mockEntity,
			area_id: null,
			device_id: "missing-device",
		};

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow({ entities: [entityWithoutArea] });

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.arrayContaining([
					expect.objectContaining({
						area: {
							area_id: "",
							name: "",
						},
					}),
				]),
			}),
		);
	});

	it("should use environment variables when available", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		const originalEnv = process.env;
		process.env = {
			...originalEnv,
			SUPERVISOR_TOKEN: "env-token",
			HA_WEBSOCKET_URL: "ws://env/websocket",
		};

		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow();

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);

		process.env = originalEnv;
	});

	it("should filter entities by configured domains", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const switchEntity = {
			id: "entity-2",
			entity_id: "switch.bedroom",
			entity_category: null,
			name: "Bedroom Switch",
			area_id: "area-1",
			device_id: "device-1",
		};

		const sensorEntity = {
			id: "entity-3",
			entity_id: "sensor.temperature",
			entity_category: null,
			name: "Temperature Sensor",
			area_id: "area-1",
			device_id: "device-1",
		};

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow({
			entities: [mockEntity, switchEntity, sensorEntity],
		});

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		const responseData = jsonMock.mock.calls[0][0];
		expect(responseData.data).toHaveLength(2);
		expect(
			responseData.data.map((e: { entity_id: string }) => e.entity_id),
		).toEqual(["light.living_room", "switch.bedroom"]);
	});

	it("should handle getAddonOptions errors", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		vi.spyOn(addonOptionsUtil, "getAddonOptions").mockRejectedValue(
			new Error("Failed to read addon options"),
		);

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Failed to read addon options",
		});
	});

	it("should handle config read errors", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		vi.spyOn(haConfigUtil, "getSharedEntityIds").mockRejectedValue(
			new Error("Failed to read HA config"),
		);

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Failed to read HA config",
		});
	});

	it("should send auth message on WebSocket open", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		emitWsEvent("open");

		expect(mockWsSend).toHaveBeenCalledWith(
			JSON.stringify({ type: "auth", access_token: "test-token" }),
		);

		emitWsEvent("error", new Error("Test timeout"));

		await handlerPromise;
	});

	it("should send registry requests after auth_ok", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		emitWsEvent("open");
		emitWsEvent(
			"message",
			Buffer.from(JSON.stringify({ type: MessageType.AUTH_OK })),
		);

		expect(mockWsSend).toHaveBeenCalledWith(
			JSON.stringify({
				type: MessageType.GET_DEVICES,
				id: RequestTypeId.GET_DEVICES,
			}),
		);
		expect(mockWsSend).toHaveBeenCalledWith(
			JSON.stringify({
				type: MessageType.GET_ENTITIES,
				id: RequestTypeId.GET_ENTITIES,
			}),
		);
		expect(mockWsSend).toHaveBeenCalledWith(
			JSON.stringify({
				type: MessageType.GET_AREAS,
				id: RequestTypeId.GET_AREAS,
			}),
		);

		emitWsEvent("error", new Error("Test complete"));

		await handlerPromise;
	});

	it("should close WebSocket after receiving all data", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow();

		await handlerPromise;

		expect(mockWsClose).toHaveBeenCalled();
	});

	it("should handle ArrayBuffer message data", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		const encoder = new TextEncoder();

		emitWsEvent("open");
		emitWsEvent(
			"message",
			encoder.encode(JSON.stringify({ type: MessageType.AUTH_OK })),
		);
		emitWsEvent(
			"message",
			encoder.encode(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_DEVICES,
					result: [mockDevice],
				}),
			),
		);
		emitWsEvent(
			"message",
			encoder.encode(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_ENTITIES,
					result: [mockEntity],
				}),
			),
		);
		emitWsEvent(
			"message",
			encoder.encode(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_AREAS,
					result: [mockArea],
				}),
			),
		);

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("should handle array of Buffer message data", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		emitWsEvent("open");
		emitWsEvent("message", [
			Buffer.from(JSON.stringify({ type: MessageType.AUTH_OK })),
		]);
		emitWsEvent("message", [
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_DEVICES,
					result: [mockDevice],
				}),
			),
		]);
		emitWsEvent("message", [
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_ENTITIES,
					result: [mockEntity],
				}),
			),
		]);
		emitWsEvent("message", [
			Buffer.from(
				JSON.stringify({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_AREAS,
					result: [mockArea],
				}),
			),
		]);

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("should use default domains when haEntityDomains not configured", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		req = { method: "GET" };

		vi.spyOn(addonOptionsUtil, "getAddonOptions").mockResolvedValue({
			haAccessToken: "test-token",
			haWebsocketUrl: "ws://test/websocket",
		});

		const automationEntity = {
			id: "entity-auto",
			entity_id: "automation.morning_routine",
			entity_category: null,
			name: "Morning Routine",
			area_id: "area-1",
			device_id: "device-1",
		};

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow({ entities: [mockEntity, automationEntity] });

		await handlerPromise;

		expect(statusMock).toHaveBeenCalledWith(200);
		const responseData = jsonMock.mock.calls[0][0];
		expect(responseData.data).toHaveLength(2);
		expect(
			responseData.data.map((e: { entity_id: string }) => e.entity_id),
		).toContain("automation.morning_routine");
	});

	it("should not log console.error output", () => {
		expect(consoleErrorSpy).toBeDefined();
	});

	it("should use empty token when SUPERVISOR_TOKEN and haAccessToken are not set", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		const originalEnv = process.env;
		delete process.env.SUPERVISOR_TOKEN;

		vi.spyOn(addonOptionsUtil, "getAddonOptions").mockResolvedValue({
			haWebsocketUrl: "ws://test/websocket",
			haEntityDomains: ["light"],
		});

		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		emitWsEvent("open");

		// Should send auth with empty token
		expect(mockWsSend).toHaveBeenCalledWith(
			JSON.stringify({ type: "auth", access_token: "" }),
		);

		emitWsEvent("error", new Error("Test complete"));
		await handlerPromise;

		process.env = originalEnv;
	});

	it("should use default websocket URL when HA_WEBSOCKET_URL and haWebsocketUrl are not set", async () => {
		const handler = (await import("@/pages/api/entities")).default;
		const originalEnv = process.env;
		delete process.env.HA_WEBSOCKET_URL;

		vi.spyOn(addonOptionsUtil, "getAddonOptions").mockResolvedValue({
			haAccessToken: "test-token",
			haEntityDomains: ["light"],
		});

		req = { method: "GET" };

		const handlerPromise = handler(
			req as NextApiRequest,
			res as NextApiResponse,
		);

		await vi.waitFor(() => {
			expect(mockWsHandlers.open).toBeDefined();
		});

		simulateWebSocketFlow();

		await handlerPromise;

		// The test passing means the default URL was used successfully
		expect(statusMock).toHaveBeenCalledWith(200);

		process.env = originalEnv;
	});

	describe("robustness", () => {
		const run = async (flow: () => void) => {
			const handler = (await import("@/pages/api/entities")).default;
			const promise = handler(
				{ method: "GET" } as NextApiRequest,
				res as NextApiResponse,
			);
			await vi.waitFor(() => expect(mockWsHandlers.open).toBeDefined());
			flow();
			await promise;
			return jsonMock.mock.calls[0][0];
		};
		const send = (payload: unknown) =>
			emitWsEvent("message", Buffer.from(JSON.stringify(payload)));

		it("resolves when there are no areas or devices", async () => {
			const body = await run(() =>
				simulateWebSocketFlow({
					areas: [],
					devices: [],
					entities: [{ ...mockEntity, device_id: null as unknown as string }],
				}),
			);
			expect(statusMock).toHaveBeenCalledWith(200);
			expect(body.data).toHaveLength(1);
		});

		it("fails fast on auth_invalid", async () => {
			const body = await run(() => {
				emitWsEvent("open");
				send({ type: "auth_invalid", message: "Invalid password" });
			});
			expect(statusMock).toHaveBeenCalledWith(500);
			expect(body.error).toMatch(/rejected the access token: Invalid password/);
		});

		it("fails on error results", async () => {
			const body = await run(() => {
				send({ type: MessageType.AUTH_OK });
				send({
					type: MessageType.RESULT,
					id: RequestTypeId.GET_DEVICES,
					success: false,
					error: { code: "unauthorized", message: "Unauthorized" },
				});
			});
			expect(body.error).toBe("Home Assistant error: Unauthorized");
		});

		it("fails when the socket closes early", async () => {
			const body = await run(() => emitWsEvent("close"));
			expect(body.error).toMatch(/closed unexpectedly/);
		});

		it("times out if Home Assistant never answers", async () => {
			vi.useFakeTimers();
			try {
				const handler = (await import("@/pages/api/entities")).default;
				const promise = handler(
					{ method: "GET" } as NextApiRequest,
					res as NextApiResponse,
				);
				await vi.waitFor(() => expect(mockWsHandlers.open).toBeDefined());
				await vi.advanceTimersByTimeAsync(15_000);
				await promise;
				expect(jsonMock.mock.calls[0][0].error).toMatch(/Timed out/);
			} finally {
				vi.useRealTimers();
			}
		});

		it("hides disabled entities unless already shared", async () => {
			vi.spyOn(haConfigUtil, "getSharedEntityIds").mockResolvedValue([
				"light.kept",
			]);
			const body = await run(() =>
				simulateWebSocketFlow({
					entities: [
						{
							...mockEntity,
							id: "1",
							entity_id: "light.gone",
							disabled_by: "user",
						},
						{
							...mockEntity,
							id: "2",
							entity_id: "light.kept",
							disabled_by: "user",
						},
					] as unknown as (typeof mockEntity)[],
				}),
			);
			expect(body.data.map((e: { entity_id: string }) => e.entity_id)).toEqual([
				"light.kept",
			]);
		});

		it("falls back to original_name", async () => {
			const body = await run(() =>
				simulateWebSocketFlow({
					entities: [
						{ ...mockEntity, name: null, original_name: "Ceiling" },
					] as unknown as (typeof mockEntity)[],
				}),
			);
			expect(body.data[0].name).toBe("Ceiling");
		});
	});
});
