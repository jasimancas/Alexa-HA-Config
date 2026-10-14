import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { errorMessage } from "@/queries/use-get-entities.query";
import type { CompiledEntity } from "@/types/items.types";

type PublishResponse = {
	success: true;
	message: string;
	entitiesCount: number;
	file: string;
	changed: boolean;
};

/**
 * Publishes entity IDs to the Alexa configuration
 */
async function publishAlexaConfig(
	entityIds: string[],
): Promise<PublishResponse> {
	try {
		const { data } = await axios.post<PublishResponse>(
			"/api/publish-alexa-config",
			{
				entityIds,
			},
		);

		if (!data.success) {
			throw new Error("Failed to publish configuration");
		}

		return data;
	} catch (error) {
		throw new Error(errorMessage(error, "Failed to publish configuration"));
	}
}

/**
 * Hook to publish changes to the Alexa configuration
 */
export function usePublishAlexaConfig() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: publishAlexaConfig,
		onSuccess: (_data, variables) => {
			// What is published is now the baseline for "pending changes"
			const published = new Set(variables);
			queryClient.setQueryData<CompiledEntity[]>(["entities"], (entities) =>
				entities?.map((e) => ({ ...e, shared: published.has(e.entity_id) })),
			);
		},
	});
}

/**
 * Validates the HA configuration or restarts Home Assistant Core
 */
export function useHaCoreAction() {
	return useMutation({
		mutationFn: async (action: "check" | "restart") => {
			try {
				await axios.post("/api/ha-core", { action });
			} catch (error) {
				throw new Error(errorMessage(error, `Failed to ${action}`));
			}
		},
	});
}
