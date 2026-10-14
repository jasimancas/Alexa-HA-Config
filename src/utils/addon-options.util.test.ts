import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReadFile = vi.fn();

vi.mock("node:fs/promises", () => ({
	default: {
		readFile: (...args: unknown[]) => mockReadFile(...args),
	},
}));

import { DOMAINS } from "@/guards/home-assistant-type.guard";
import {
	clearOptionsCache,
	DEFAULT_OPTIONS,
	getAddonOptions,
	OPTIONS_PATH,
} from "./addon-options.util";

describe("addon-options.util", () => {
	beforeEach(() => {
		clearOptionsCache();
		vi.clearAllMocks();
	});

	afterEach(() => {
		clearOptionsCache();
	});

	describe("getAddonOptions", () => {
		it("should return options from file when it exists", async () => {
			const mockOptions = {
				haWebsocketUrl: "http://custom.local:8123",
				haAccessToken: "secret-token",
				haEntityDomains: DOMAINS,
			};
			mockReadFile.mockResolvedValue(JSON.stringify(mockOptions));

			const result = await getAddonOptions();

			expect(mockReadFile).toHaveBeenCalledWith(OPTIONS_PATH, "utf-8");
			expect(result).toEqual(mockOptions);
		});

		it("should merge with default options when file has partial options", async () => {
			const mockOptions = {};
			mockReadFile.mockResolvedValue(JSON.stringify(mockOptions));

			const result = await getAddonOptions();

			expect(result).toEqual(DEFAULT_OPTIONS);
		});

		it("should return default options when file does not exist", async () => {
			const error = new Error("ENOENT") as NodeJS.ErrnoException;
			error.code = "ENOENT";
			mockReadFile.mockRejectedValue(error);

			const result = await getAddonOptions();

			expect(result).toEqual(DEFAULT_OPTIONS);
		});

		it("should return default options when file cannot be read", async () => {
			mockReadFile.mockRejectedValue(new Error("Permission denied"));

			const result = await getAddonOptions();

			expect(result).toEqual(DEFAULT_OPTIONS);
		});

		it("should return default options when file contains invalid JSON", async () => {
			mockReadFile.mockResolvedValue("not valid json");

			const result = await getAddonOptions();

			expect(result).toEqual(DEFAULT_OPTIONS);
		});

		it("should cache options after first read", async () => {
			const mockOptions = {
				haWebsocketUrl: "http://cached.local:8123",
			};
			mockReadFile.mockResolvedValue(JSON.stringify(mockOptions));

			const result1 = await getAddonOptions();
			const result2 = await getAddonOptions();

			expect(mockReadFile).toHaveBeenCalledTimes(1);
			expect(result1).toEqual(result2);
		});

		it("should read file again after cache is cleared", async () => {
			const mockOptions1 = {
				haWebsocketUrl: "http://first.local:8123",
				haAccessToken: "first-token",
				haEntityDomains: DOMAINS,
			};
			const mockOptions2 = {
				haWebsocketUrl: "http://second.local:8123",
				haAccessToken: "second-token",
				haEntityDomains: DOMAINS,
			};
			mockReadFile
				.mockResolvedValueOnce(JSON.stringify(mockOptions1))
				.mockResolvedValueOnce(JSON.stringify(mockOptions2));

			const result1 = await getAddonOptions();
			clearOptionsCache();
			const result2 = await getAddonOptions();

			expect(mockReadFile).toHaveBeenCalledTimes(2);
			expect(result1).toEqual(mockOptions1);
			expect(result2).toEqual(mockOptions2);
		});
	});

	describe("clearOptionsCache", () => {
		it("should clear the cached options", async () => {
			const mockOptions = {
				haWebsocketUrl: "http://test.local:8123",
			};
			mockReadFile.mockResolvedValue(JSON.stringify(mockOptions));

			await getAddonOptions();
			expect(mockReadFile).toHaveBeenCalledTimes(1);

			clearOptionsCache();

			await getAddonOptions();
			expect(mockReadFile).toHaveBeenCalledTimes(2);
		});
	});
});
