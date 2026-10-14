import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlexaEntityConfig } from "@/types/alexa.types";
import type { CompiledEntity } from "@/types/items.types";

const CONFIG_FIELDS = ["name", "description", "display_categories"] as const;

/** Trims fields and drops empty ones so edits compare by meaning */
export const cleanConfig = (cfg?: AlexaEntityConfig): AlexaEntityConfig => {
	const out: AlexaEntityConfig = {};
	for (const field of CONFIG_FIELDS) {
		const value = cfg?.[field]?.trim();
		if (value) out[field] = value;
	}
	return out;
};

const sameConfig = (a?: AlexaEntityConfig, b?: AlexaEntityConfig) => {
	const ca = cleanConfig(a);
	const cb = cleanConfig(b);
	return CONFIG_FIELDS.every((f) => ca[f] === cb[f]);
};

export const errorMessage = (error: unknown, fallback: string): string => {
	if (axios.isAxiosError(error) && error.response?.data?.error) {
		return error.response.data.error;
	}
	return (error as Error)?.message || fallback;
};

export const useGetEntities = () => {
	const [syncedEntities, setSyncedEntities] = useState<Set<string>>(new Set());
	// Local edits of entity_config, keyed by entity_id
	const [configEdits, setConfigEdits] = useState<
		Record<string, AlexaEntityConfig>
	>({});
	const { data, ...query } = useQuery<CompiledEntity[]>({
		queryKey: ["entities"],
		queryFn: async () => {
			try {
				const result = await axios.get("/api/entities");
				if (result.data?.success) {
					return result.data.data;
				}
				throw new Error(result.data?.error);
			} catch (error) {
				throw new Error(errorMessage(error, "Failed to load entities"));
			}
		},
		refetchOnWindowFocus: false,
	});

	// What is currently written in configuration.yaml
	const publishedIds = useMemo(
		() => new Set((data ?? []).filter((e) => e.shared).map((e) => e.entity_id)),
		[data],
	);

	const publishedConfig = useMemo(
		() =>
			Object.fromEntries((data ?? []).map((e) => [e.entity_id, e.alexa ?? {}])),
		[data],
	);

	useEffect(() => {
		setSyncedEntities(new Set(publishedIds));
	}, [publishedIds]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local edits whenever the published config changes (load, reload or publish)
	useEffect(() => {
		setConfigEdits({});
	}, [publishedConfig]);

	const getAlexaConfig = useCallback(
		(entityId: string): AlexaEntityConfig =>
			configEdits[entityId] ?? publishedConfig[entityId] ?? {},
		[configEdits, publishedConfig],
	);

	const setAlexaConfig = useCallback(
		(entityId: string, cfg: AlexaEntityConfig) =>
			setConfigEdits((prev) => ({ ...prev, [entityId]: cleanConfig(cfg) })),
		[],
	);

	/** Changed configs to publish; null removes the entity's entry */
	const getEntityConfigChanges = useCallback((): Record<
		string,
		AlexaEntityConfig | null
	> => {
		const changes: Record<string, AlexaEntityConfig | null> = {};
		for (const [id, cfg] of Object.entries(configEdits)) {
			if (sameConfig(cfg, publishedConfig[id])) continue;
			changes[id] = Object.keys(cfg).length > 0 ? cfg : null;
		}
		return changes;
	}, [configEdits, publishedConfig]);

	const setSyncStatus = useCallback(
		(entityIds: string | string[], synced: boolean): void => {
			const ids = Array.isArray(entityIds) ? entityIds : [entityIds];
			setSyncedEntities((prev) => {
				const next = new Set(prev);
				for (const id of ids) {
					if (synced) next.add(id);
					else next.delete(id);
				}
				return next;
			});
		},
		[],
	);

	const isSynced = useCallback(
		(entityId: string) => syncedEntities.has(entityId),
		[syncedEntities],
	);
	const getSyncedEntityIds = useCallback(
		(): string[] => Array.from(syncedEntities).sort(),
		[syncedEntities],
	);
	const getSyncedCount = useCallback(
		(): number => syncedEntities.size,
		[syncedEntities],
	);

	const pendingChanges = useMemo(() => {
		let added = 0;
		let removed = 0;
		for (const id of syncedEntities) if (!publishedIds.has(id)) added++;
		for (const id of publishedIds) if (!syncedEntities.has(id)) removed++;
		const edited = Object.keys(getEntityConfigChanges()).length;
		return { added, removed, edited, total: added + removed + edited };
	}, [syncedEntities, publishedIds, getEntityConfigChanges]);

	const discardChanges = useCallback(() => {
		setSyncedEntities(new Set(publishedIds));
		setConfigEdits({});
	}, [publishedIds]);

	return {
		...query,
		data,
		setSyncStatus,
		isSynced,
		getSyncedEntityIds,
		getSyncedCount,
		pendingChanges,
		discardChanges,
		getAlexaConfig,
		setAlexaConfig,
		getEntityConfigChanges,
	};
};
