import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import nock from "nock";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGetEntities } from "./use-get-entities.query";

axios.defaults.baseURL = "http://localhost:3000";

const entity = (
	entity_id: string,
	shared: boolean,
	alexa: Record<string, string> = {},
) => ({
	alexa,
	id: entity_id,
	entity_id,
	name: entity_id,
	entity_category: null,
	shared,
	device: { id: "", name: "", manufacturer: "", model: "" },
	area: { area_id: "", name: "" },
});

describe("useGetEntities", () => {
	let queryClient: QueryClient;
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	const setup = async () => {
		nock("http://localhost:3000")
			.get("/api/entities")
			.reply(200, {
				success: true,
				data: [
					entity("light.a", true, { name: "Salón" }),
					entity("light.b", false),
				],
			});
		const hook = renderHook(() => useGetEntities(), { wrapper });
		await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
		await waitFor(() => expect(hook.result.current.getSyncedCount()).toBe(1));
		return hook;
	};

	it("starts from the published selection with no pending changes", async () => {
		const { result } = await setup();
		expect(result.current.isSynced("light.a")).toBe(true);
		expect(result.current.isSynced("light.b")).toBe(false);
		expect(result.current.pendingChanges.total).toBe(0);
	});

	it("re-renders and tracks pending changes when toggling", async () => {
		const { result } = await setup();

		act(() => result.current.setSyncStatus("light.b", true));
		expect(result.current.isSynced("light.b")).toBe(true);
		expect(result.current.pendingChanges).toEqual({
			added: 1,
			removed: 0,
			edited: 0,
			total: 1,
		});

		act(() => result.current.setSyncStatus("light.a", false));
		expect(result.current.getSyncedEntityIds()).toEqual(["light.b"]);
		expect(result.current.pendingChanges.total).toBe(2);
	});

	it("supports bulk changes and discarding", async () => {
		const { result } = await setup();

		act(() => result.current.setSyncStatus(["light.a", "light.b"], false));
		expect(result.current.getSyncedCount()).toBe(0);

		act(() => result.current.discardChanges());
		expect(result.current.getSyncedEntityIds()).toEqual(["light.a"]);
		expect(result.current.pendingChanges.total).toBe(0);
	});

	it("surfaces the API error message", async () => {
		nock("http://localhost:3000").get("/api/entities").reply(500, {
			success: false,
			error: "Home Assistant rejected the access token",
		});
		const { result } = renderHook(() => useGetEntities(), { wrapper });
		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.error?.message).toBe(
			"Home Assistant rejected the access token",
		);
	});

	it("tracks entity config edits as pending changes", async () => {
		const { result } = await setup();
		expect(result.current.getAlexaConfig("light.a")).toEqual({ name: "Salón" });

		act(() =>
			result.current.setAlexaConfig("light.b", {
				name: "  Cocina ",
				description: "",
			}),
		);
		expect(result.current.getAlexaConfig("light.b")).toEqual({
			name: "Cocina",
		});
		expect(result.current.pendingChanges).toMatchObject({
			edited: 1,
			total: 1,
		});

		act(() => result.current.setAlexaConfig("light.a", {}));
		expect(result.current.getEntityConfigChanges()).toEqual({
			"light.a": null,
			"light.b": { name: "Cocina" },
		});
	});

	it("ignores edits that end up equal to the published config", async () => {
		const { result } = await setup();
		act(() => result.current.setAlexaConfig("light.a", { name: "Salón " }));
		expect(result.current.getEntityConfigChanges()).toEqual({});
		expect(result.current.pendingChanges.total).toBe(0);
	});

	it("discards config edits", async () => {
		const { result } = await setup();
		act(() => result.current.setAlexaConfig("light.b", { name: "X" }));
		act(() => result.current.discardChanges());
		expect(result.current.getEntityConfigChanges()).toEqual({});
	});
});
