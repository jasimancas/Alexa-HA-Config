import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/publish-alexa-config";
import * as haConfigUtil from "@/utils/ha-config.util";

vi.mock("@/utils/ha-config.util");

describe("/api/publish-alexa-config", () => {
	let req: Partial<NextApiRequest>;
	let res: Partial<NextApiResponse>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Mock response object
		jsonMock = vi.fn();
		statusMock = vi.fn(() => ({ json: jsonMock }));

		res = {
			status: statusMock as unknown as NextApiResponse["status"],
		};

		// Suppress console.error output during tests
		vi.spyOn(console, "error").mockImplementation(() => {});

		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should successfully update configuration with valid entity IDs", async () => {
		const mockResult = {
			success: true as const,
			message: "Configuration updated successfully",
			entitiesCount: 2,
			files: ["/homeassistant/configuration.yaml"],
			changed: true,
		};

		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockResolvedValue(
			mockResult,
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["light.living_room", "switch.bedroom"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(haConfigUtil.updateAlexaConfiguration).toHaveBeenCalledWith(
			["light.living_room", "switch.bedroom"],
			undefined,
		);
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(mockResult);
	});

	it("should handle empty entity IDs array", async () => {
		const mockResult = {
			success: true as const,
			message: "Configuration updated successfully",
			entitiesCount: 0,
			files: ["/homeassistant/configuration.yaml"],
			changed: true,
		};

		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockResolvedValue(
			mockResult,
		);

		req = {
			method: "POST",
			body: {
				entityIds: [],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(haConfigUtil.updateAlexaConfiguration).toHaveBeenCalledWith(
			[],
			undefined,
		);
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(mockResult);
	});

	it("should return 405 for non-POST requests", async () => {
		req = {
			method: "GET",
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use POST.",
		});
		expect(haConfigUtil.updateAlexaConfiguration).not.toHaveBeenCalled();
	});

	it("should return 405 for PUT request", async () => {
		req = {
			method: "PUT",
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use POST.",
		});
	});

	it("should return 405 for DELETE request", async () => {
		req = {
			method: "DELETE",
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(405);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Method not allowed. Use POST.",
		});
	});

	it("should return 400 when entityIds is not an array", async () => {
		req = {
			method: "POST",
			body: {
				entityIds: "not-an-array",
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid request body. Expected { entityIds: string[] }",
		});
		expect(haConfigUtil.updateAlexaConfiguration).not.toHaveBeenCalled();
	});

	it("should return 400 when entityIds is missing", async () => {
		req = {
			method: "POST",
			body: {},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid request body. Expected { entityIds: string[] }",
		});
		expect(haConfigUtil.updateAlexaConfiguration).not.toHaveBeenCalled();
	});

	it("should return 400 when entityIds is null", async () => {
		req = {
			method: "POST",
			body: {
				entityIds: null,
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid request body. Expected { entityIds: string[] }",
		});
	});

	it("should return 400 when entityIds is an object", async () => {
		req = {
			method: "POST",
			body: {
				entityIds: { key: "value" },
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid request body. Expected { entityIds: string[] }",
		});
	});

	it("should return 400 when body is missing", async () => {
		req = {
			method: "POST",
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid request body. Expected { entityIds: string[] }",
		});
	});

	it("should handle updateAlexaConfiguration errors with message", async () => {
		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockRejectedValue(
			new Error("Invalid entity ID format detected"),
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["invalid_entity"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid entity ID format detected",
		});
	});

	it("should handle updateAlexaConfiguration errors without message", async () => {
		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockRejectedValue(
			new Error(""),
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["light.test"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Failed to update configuration",
		});
	});

	it("should handle non-Error exceptions", async () => {
		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockRejectedValue(
			"string error",
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["light.test"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Failed to update configuration",
		});
	});

	it("should handle file system errors", async () => {
		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockRejectedValue(
			new Error("Permission denied writing to configuration file"),
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["light.living_room"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Permission denied writing to configuration file",
		});
	});

	it("should handle YAML parsing errors", async () => {
		vi.spyOn(haConfigUtil, "updateAlexaConfiguration").mockRejectedValue(
			new Error("Failed to parse YAML: unknown tag"),
		);

		req = {
			method: "POST",
			body: {
				entityIds: ["light.bedroom"],
			},
		};

		await handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Failed to parse YAML: unknown tag",
		});
	});
});
