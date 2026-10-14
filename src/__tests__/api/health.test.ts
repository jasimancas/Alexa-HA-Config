import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/health";

describe("/api/health", () => {
	let req: Partial<NextApiRequest>;
	let res: Partial<NextApiResponse>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;
	const originalEnv = process.env.npm_package_version;

	beforeEach(() => {
		// Mock response object
		jsonMock = vi.fn();
		statusMock = vi.fn(() => ({ json: jsonMock }));

		res = {
			status: statusMock as unknown as NextApiResponse["status"],
		};
	});

	afterEach(() => {
		// Restore original environment variable
		if (originalEnv !== undefined) {
			process.env.npm_package_version = originalEnv;
		} else {
			delete process.env.npm_package_version;
		}
	});

	it("should return 200 with health check data", () => {
		req = {
			method: "GET",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "ok",
				timestamp: expect.any(String),
				uptime: expect.any(Number),
				version: expect.any(String),
			}),
		);
	});

	it("should return a valid ISO timestamp", () => {
		req = {
			method: "GET",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		const responseData = jsonMock.mock.calls[0][0];
		const timestamp = new Date(responseData.timestamp);

		expect(timestamp).toBeInstanceOf(Date);
		expect(timestamp.getTime()).not.toBeNaN();
	});

	it("should return a positive uptime", () => {
		req = {
			method: "GET",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		const responseData = jsonMock.mock.calls[0][0];

		expect(responseData.uptime).toBeGreaterThan(0);
	});

	it("should handle any HTTP method", () => {
		req = {
			method: "POST",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "ok",
			}),
		);
	});

	it("should use npm_package_version when set", () => {
		process.env.npm_package_version = "2.5.0";
		req = {
			method: "GET",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		const responseData = jsonMock.mock.calls[0][0];
		expect(responseData.version).toBe("2.5.0");
	});

	it("should fallback to 1.0.0 when npm_package_version is not set", () => {
		delete process.env.npm_package_version;
		req = {
			method: "GET",
		};

		handler(req as NextApiRequest, res as NextApiResponse);

		const responseData = jsonMock.mock.calls[0][0];
		expect(responseData.version).toBe("1.0.0");
	});
});
