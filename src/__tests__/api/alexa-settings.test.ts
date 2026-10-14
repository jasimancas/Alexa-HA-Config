import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/alexa-settings";
import * as haConfigUtil from "@/utils/ha-config.util";

vi.mock("@/utils/ha-config.util");

describe("/api/alexa-settings", () => {
	let res: Partial<NextApiResponse>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;

	const call = (method: string, body?: unknown) =>
		handler({ method, body } as NextApiRequest, res as NextApiResponse);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		jsonMock = vi.fn();
		statusMock = vi.fn(() => ({ json: jsonMock }));
		res = { status: statusMock as unknown as NextApiResponse["status"] };
	});

	it("returns settings without the entity data", async () => {
		vi.mocked(haConfigUtil.readAlexaConfig).mockResolvedValue({
			includeEntities: ["light.a"],
			entityConfig: { "light.a": { name: "x" } },
			locale: "es-ES",
			region: "eu",
			secrets: [],
			proactiveEvents: false,
		});
		await call("GET");
		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: {
				locale: "es-ES",
				region: "eu",
				secrets: [],
				proactiveEvents: false,
			},
		});
	});

	it("updates settings, mapping empty locale/region to null", async () => {
		vi.mocked(haConfigUtil.updateAlexaSettings).mockResolvedValue({
			files: [],
		});
		await call("POST", { locale: "", region: "eu", clientId: "abc", other: 1 });
		expect(haConfigUtil.updateAlexaSettings).toHaveBeenCalledWith({
			locale: null,
			region: "eu",
			clientId: "abc",
		});
		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("migrates secrets", async () => {
		vi.mocked(haConfigUtil.migrateSecrets).mockResolvedValue({
			migrated: ["client_id"],
			files: ["/homeassistant/secrets.yaml"],
		});
		await call("POST", { action: "migrate-secrets" });
		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			migrated: ["client_id"],
			files: ["/homeassistant/secrets.yaml"],
		});
	});

	it("rejects non-string values", async () => {
		await call("POST", { clientSecret: 123 });
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(haConfigUtil.updateAlexaSettings).not.toHaveBeenCalled();
	});

	it("returns 400 for validation errors and 500 otherwise", async () => {
		vi.mocked(haConfigUtil.updateAlexaSettings).mockRejectedValueOnce(
			new Error("Unsupported locale: xx"),
		);
		await call("POST", { locale: "xx" });
		expect(statusMock).toHaveBeenLastCalledWith(400);

		vi.mocked(haConfigUtil.updateAlexaSettings).mockRejectedValueOnce(
			new Error("Permission denied"),
		);
		await call("POST", { locale: "es-ES" });
		expect(statusMock).toHaveBeenLastCalledWith(500);
	});

	it("rejects other methods", async () => {
		await call("DELETE");
		expect(statusMock).toHaveBeenCalledWith(405);
	});
});
