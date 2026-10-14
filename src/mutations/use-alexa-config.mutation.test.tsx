import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import nock from "nock";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePublishAlexaConfig } from "./use-alexa-config.mutation";

// Configure axios defaults for testing
axios.defaults.baseURL = "http://localhost:3000";

describe("usePublishAlexaConfig", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		nock.cleanAll();
		nock.disableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("should publish config successfully", async () => {
		const mockResponse = {
			success: true,
			message: "Configuration updated",
			entitiesCount: 2,
		};

		const entityIds = ["light.living_room", "switch.bedroom"];

		nock("http://localhost:3000")
			.post("/api/publish-alexa-config", { entityIds })
			.reply(200, mockResponse);

		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });

		result.current.mutate(entityIds);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
	});

	it("should handle publish error with error message", async () => {
		const entityIds = ["light.living_room"];

		nock("http://localhost:3000")
			.post("/api/publish-alexa-config", { entityIds })
			.reply(400, { success: false, error: "Failed to save" });

		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });

		result.current.mutate(entityIds);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeTruthy();
		expect((result.current.error as Error).message).toBe("Failed to save");
	});

	it("should handle publish error without specific message", async () => {
		const entityIds = ["light.living_room"];

		nock("http://localhost:3000")
			.post("/api/publish-alexa-config", { entityIds })
			.reply(200, { success: false });

		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });

		result.current.mutate(entityIds);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeTruthy();
		expect((result.current.error as Error).message).toBe(
			"Failed to publish configuration",
		);
	});

	it("should handle network error", async () => {
		const entityIds = ["light.living_room"];

		nock("http://localhost:3000")
			.post("/api/publish-alexa-config", { entityIds })
			.replyWithError("Network error");

		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });

		result.current.mutate(entityIds);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeTruthy();
	});

	it("should update query cache on successful publish", async () => {
		const mockResponse = {
			success: true,
			message: "Configuration updated",
			entitiesCount: 1,
		};

		const entityIds = ["light.living_room"];

		nock("http://localhost:3000")
			.post("/api/publish-alexa-config", { entityIds })
			.reply(200, mockResponse);

		queryClient.setQueryData(
			["entities"],
			[
				{ entity_id: "light.living_room", shared: false },
				{ entity_id: "switch.old", shared: true },
			],
		);

		const { result } = renderHook(() => usePublishAlexaConfig(), { wrapper });

		result.current.mutate(entityIds);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Published selection becomes the new baseline
		expect(queryClient.getQueryData(["entities"])).toEqual([
			{ entity_id: "light.living_room", shared: true },
			{ entity_id: "switch.old", shared: false },
		]);
	});
});
