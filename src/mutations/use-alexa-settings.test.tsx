import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import nock from "nock";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	useAlexaSettings,
	useHaCoreAction,
	useMigrateSecrets,
	usePublishAlexaConfig,
	useUpdateAlexaSettings,
} from "./use-alexa-config.mutation";

axios.defaults.baseURL = "http://localhost:3000";
const api = () => nock("http://localhost:3000");

describe("Alexa settings hooks", () => {
	let queryClient: QueryClient;
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	it("loads settings", async () => {
		const settings = {
			locale: "es-ES",
			region: "eu",
			secrets: [],
			proactiveEvents: true,
		};
		api()
			.get("/api/alexa-settings")
			.reply(200, { success: true, data: settings });
		const { result } = renderHook(() => useAlexaSettings(), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(settings);
	});

	it("surfaces settings load errors", async () => {
		api()
			.get("/api/alexa-settings")
			.reply(500, { success: false, error: "boom" });
		const { result } = renderHook(() => useAlexaSettings(), { wrapper });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("boom");
	});

	it("saves settings and refreshes them", async () => {
		api()
			.post("/api/alexa-settings", { region: "eu" })
			.reply(200, { success: true, files: ["a"] });
		queryClient.setQueryData(["alexa-settings"], { locale: "" });
		const { result } = renderHook(() => useUpdateAlexaSettings(), { wrapper });
		result.current.mutate({ region: "eu" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(queryClient.getQueryState(["alexa-settings"])?.isInvalidated).toBe(
			true,
		);
	});

	it("reports settings save errors", async () => {
		api()
			.post("/api/alexa-settings")
			.reply(400, { success: false, error: "Unsupported locale: xx" });
		const { result } = renderHook(() => useUpdateAlexaSettings(), { wrapper });
		result.current.mutate({ locale: "xx" });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Unsupported locale: xx");
	});

	it("migrates secrets", async () => {
		api()
			.post("/api/alexa-settings", { action: "migrate-secrets" })
			.reply(200, { success: true, migrated: ["client_id"], files: [] });
		const { result } = renderHook(() => useMigrateSecrets(), { wrapper });
		result.current.mutate();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.migrated).toEqual(["client_id"]);
	});

	it("reports migration errors", async () => {
		api()
			.post("/api/alexa-settings")
			.reply(500, { success: false, error: "Permission denied" });
		const { result } = renderHook(() => useMigrateSecrets(), { wrapper });
		result.current.mutate();
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe("Permission denied");
	});

	it("runs Home Assistant core actions", async () => {
		api()
			.post("/api/ha-core", { action: "check" })
			.reply(200, { success: true });
		const { result } = renderHook(() => useHaCoreAction(), { wrapper });
		await result.current.mutateAsync("check");
		api()
			.post("/api/ha-core", { action: "restart" })
			.reply(502, { success: false, error: "Supervisor down" });
		await expect(result.current.mutateAsync("restart")).rejects.toThrow(
			"Supervisor down",
		);
	});

	it("publishes entity config and updates the cached entities", async () => {
		const entityConfig = { "light.a": { name: "Salón" }, "light.b": null };
		api()
			.post("/api/publish-alexa-config", {
				entityIds: ["light.a"],
				entityConfig,
			})
			.reply(200, {
				success: true,
				entitiesCount: 1,
				files: [],
				changed: true,
			});
		queryClient.setQueryData(
			["entities"],
			[
				{ entity_id: "light.a", shared: false, alexa: {} },
				{ entity_id: "light.b", shared: true, alexa: { name: "Old" } },
				{ entity_id: "light.c", shared: false, alexa: { name: "Keep" } },
			],
		);
		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });
		result.current.mutate({ entityIds: ["light.a"], entityConfig });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(queryClient.getQueryData(["entities"])).toEqual([
			{ entity_id: "light.a", shared: true, alexa: { name: "Salón" } },
			{ entity_id: "light.b", shared: false, alexa: {} },
			{ entity_id: "light.c", shared: false, alexa: { name: "Keep" } },
		]);
	});
});
