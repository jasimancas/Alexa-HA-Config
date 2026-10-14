import type { NextApiRequest, NextApiResponse } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/ha-core";

describe("/api/ha-core", () => {
	let res: Partial<NextApiResponse>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;
	const fetchMock = vi.fn();

	const call = (body: unknown, method = "POST") =>
		handler({ method, body } as NextApiRequest, res as NextApiResponse);

	beforeEach(() => {
		jsonMock = vi.fn();
		statusMock = vi.fn(() => ({ json: jsonMock }));
		res = { status: statusMock as unknown as NextApiResponse["status"] };
		process.env.SUPERVISOR_TOKEN = "token";
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockReset();
	});

	afterEach(() => {
		delete process.env.SUPERVISOR_TOKEN;
		vi.unstubAllGlobals();
	});

	it("rejects non-POST", async () => {
		await call({}, "GET");
		expect(statusMock).toHaveBeenCalledWith(405);
	});

	it("rejects unknown actions", async () => {
		await call({ action: "rm -rf" });
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns 503 without a supervisor token", async () => {
		delete process.env.SUPERVISOR_TOKEN;
		await call({ action: "check" });
		expect(statusMock).toHaveBeenCalledWith(503);
	});

	it("calls the supervisor with the token", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ result: "ok" }),
		});
		await call({ action: "check" });
		expect(fetchMock).toHaveBeenCalledWith("http://supervisor/core/check", {
			method: "POST",
			headers: { Authorization: "Bearer token" },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("surfaces config check errors", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 400,
			json: async () => ({ result: "error", message: "Invalid config" }),
		});
		await call({ action: "check" });
		expect(statusMock).toHaveBeenCalledWith(422);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			error: "Invalid config",
		});
	});

	it("treats a dropped connection during restart as accepted", async () => {
		fetchMock.mockRejectedValue(new Error("socket hang up"));
		await call({ action: "restart" });
		expect(statusMock).toHaveBeenCalledWith(202);
	});
});
