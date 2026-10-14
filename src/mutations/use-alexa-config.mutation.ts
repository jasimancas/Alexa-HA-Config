import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { errorMessage } from "@/queries/use-get-entities.query";
import type {
	AlexaEntityConfig,
	AlexaSettings,
	AlexaSettingsUpdate,
} from "@/types/alexa.types";
import type { CompiledEntity } from "@/types/items.types";

type PublishResponse = {
	success: true;
	message: string;
	entitiesCount: number;
	files: string[];
	changed: boolean;
};

export type PublishInput = {
	entityIds: string[];
	entityConfig?: Record<string, AlexaEntityConfig | null>;
};

/**
 * Publishes the entity selection and per-entity config to the Alexa configuration
 */
async function publishAlexaConfig({
	entityIds,
	entityConfig,
}: PublishInput): Promise<PublishResponse> {
	try {
		const { data } = await axios.post<PublishResponse>(
			"/api/publish-alexa-config",
			entityConfig && Object.keys(entityConfig).length > 0
				? { entityIds, entityConfig }
				: { entityIds },
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
		onSuccess: (_data, { entityIds, entityConfig = {} }) => {
			// What is published is now the baseline for "pending changes"
			const published = new Set(entityIds);
			queryClient.setQueryData<CompiledEntity[]>(["entities"], (entities) =>
				entities?.map((e) => ({
					...e,
					shared: published.has(e.entity_id),
					alexa:
						e.entity_id in entityConfig
							? (entityConfig[e.entity_id] ?? {})
							: e.alexa,
				})),
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

/**
 * Locale, proactive-events region and credential status (never values)
 */
export function useAlexaSettings() {
	return useQuery<AlexaSettings>({
		queryKey: ["alexa-settings"],
		queryFn: async () => {
			try {
				const { data } = await axios.get("/api/alexa-settings");
				return data.data;
			} catch (error) {
				throw new Error(errorMessage(error, "Failed to load Alexa settings"));
			}
		},
		refetchOnWindowFocus: false,
	});
}

// Entities are not refetched so unpublished selections survive
const afterSettingsChange = (queryClient: ReturnType<typeof useQueryClient>) =>
	queryClient.invalidateQueries({ queryKey: ["alexa-settings"] });

export function useUpdateAlexaSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (update: AlexaSettingsUpdate) => {
			try {
				const { data } = await axios.post<{ files: string[] }>(
					"/api/alexa-settings",
					update,
				);
				return data;
			} catch (error) {
				throw new Error(errorMessage(error, "Failed to save Alexa settings"));
			}
		},
		onSuccess: () => afterSettingsChange(queryClient),
	});
}

export function useMigrateSecrets() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			try {
				const { data } = await axios.post<{
					migrated: string[];
					files: string[];
				}>("/api/alexa-settings", { action: "migrate-secrets" });
				return data;
			} catch (error) {
				throw new Error(errorMessage(error, "Failed to migrate secrets"));
			}
		},
		onSuccess: () => afterSettingsChange(queryClient),
	});
}
