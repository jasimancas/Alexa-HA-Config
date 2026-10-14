import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompiledEntity } from "@/types/items.types";

export const errorMessage = (error: unknown, fallback: string): string => {
	if (axios.isAxiosError(error) && error.response?.data?.error) {
		return error.response.data.error;
	}
	return (error as Error)?.message || fallback;
};

export const useGetEntities = () => {
	const [syncedEntities, setSyncedEntities] = useState<Set<string>>(new Set());
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

	useEffect(() => {
		setSyncedEntities(new Set(publishedIds));
	}, [publishedIds]);

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
		return { added, removed, total: added + removed };
	}, [syncedEntities, publishedIds]);

	const discardChanges = useCallback(
		() => setSyncedEntities(new Set(publishedIds)),
		[publishedIds],
	);

	return {
		...query,
		data,
		setSyncStatus,
		isSynced,
		getSyncedEntityIds,
		getSyncedCount,
		pendingChanges,
		discardChanges,
	};
};
