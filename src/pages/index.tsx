import {
	ArrowPathIcon,
	ArrowUpCircleIcon,
	Cog6ToothIcon,
} from "@heroicons/react/24/solid";
import {
	Button,
	Card,
	CardBody,
	CardFooter,
	CardHeader,
	Menu,
	MenuHandler,
	MenuItem,
	MenuList,
	Tab,
	Tabs,
	TabsHeader,
	Typography,
} from "@material-tailwind/react";
import { chunk, filter, orderBy, startCase } from "lodash";
import Head from "next/head";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import toast from "react-hot-toast";
import { AlexaCell } from "@/components/alexa-cell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntityConfigDialog } from "@/components/entity-config-dialog";
import { SecretsBanner } from "@/components/secrets-banner";
import { SettingsDialog } from "@/components/settings-dialog";
import { type Row, SortableTable } from "@/components/sortable-table";
import { type FilterOption, SplitSearch } from "@/components/split-search";
import { createTableHeaders, tableQuickFilters } from "@/configs/entities";
import {
	useAlexaSettings,
	useHaCoreAction,
	useMigrateSecrets,
	usePublishAlexaConfig,
	useUpdateAlexaSettings,
} from "@/mutations/use-alexa-config.mutation";
import { useGetEntities } from "@/queries/use-get-entities.query";
import type { AlexaSettingsUpdate } from "@/types/alexa.types";
import { PROACTIVE_WARNING } from "@/utils/alexa-compat.util";

export default function Home() {
	const publishMutation = usePublishAlexaConfig();
	const haCoreMutation = useHaCoreAction();
	const { data: alexaSettings } = useAlexaSettings();
	const settingsMutation = useUpdateAlexaSettings();
	const migrateMutation = useMigrateSecrets();
	const {
		data: entities,
		isLoading,
		isSuccess,
		isError,
		error,
		refetch,
		setSyncStatus,
		isSynced,
		getSyncedEntityIds,
		getSyncedCount,
		pendingChanges,
		discardChanges,
		getAlexaConfig,
		setAlexaConfig,
		getEntityConfigChanges,
	} = useGetEntities();

	const [sortBy, setSortBy] = useState<string>("device_name");
	const [sortDirection, setSortDirection] = useState<number>(1);
	const [term, setTerm] = useState<string>("");
	const [firstSelection, setFirstSelection] = useState<string>("");
	const [secondSelection, setSecondSelection] = useState<string>("");
	const [page, setPage] = useState<number>(0);
	const [show, setShow] = useState<"all" | "synced" | "unsynced">("all");
	const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
	const [showRestartDialog, setShowRestartDialog] = useState<boolean>(false);
	const [showSettings, setShowSettings] = useState<boolean>(false);
	const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
	const [itemsPerPage, setItemsPerPage] = useState<number | "all">(10);

	const itemsPerPageOptions: (number | "all")[] = [10, 20, 50, 100, "all"];

	// Build hierarchical filter options: domains with areas as children
	const filterOptions: FilterOption[] = useMemo(() => {
		if (!entities) {
			return [];
		}

		const domains = new Map<string, FilterOption>();
		const areas = new Map<string, FilterOption>();
		const manufacturers = new Map<string, FilterOption>();

		entities.forEach((entity) => {
			const domain = entity.entity_id.split(".")[0];

			// Add area as child of domain
			if (entity.area?.name) {
				areas.set(entity.area.name, {
					label: entity.area.name,
					value: entity.area.name,
				});
			}

			// Add domain with its areas as children
			domains.set(domain, {
				label: startCase(domain),
				value: domain,
			});

			// Add manufacturer
			if (entity.device.manufacturer) {
				manufacturers.set(entity.device.manufacturer, {
					label: startCase(entity.device.manufacturer),
					value: entity.device.manufacturer,
				});
			}
		});

		return [
			{
				label: "Domain",
				value: "domain",
				children: Array.from(domains.values()).sort((a, b) =>
					a.label.localeCompare(b.label),
				),
			},
			{
				label: "Area",
				value: "area",
				children: Array.from(areas.values()).sort((a, b) =>
					a.label.localeCompare(b.label),
				),
			},
			{
				label: "Manufacturer",
				value: "manufacturer",
				children: Array.from(manufacturers.values()).sort((a, b) =>
					a.label.localeCompare(b.label),
				),
			},
		];
	}, [entities]);

	useEffect(() => {
		if (!isSuccess && !isLoading && isError) {
			toast.error(error?.message || "Error");
		}
	}, [isSuccess, isLoading, isError, error]);

	// Warn before leaving with unpublished changes
	useEffect(() => {
		if (pendingChanges.total === 0) return;
		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [pendingChanges.total]);

	const onSort = (key: string) => {
		if (key === sortBy) {
			setSortDirection(-sortDirection);
		}

		if (key !== sortBy) {
			setSortBy(key);
			setSortDirection(1);
		}
	};

	const onNextPageClick = () => {
		setPage(currentPage + 1);
	};

	const onPrevPageClick = () => {
		setPage(currentPage - 1);
	};

	const onFilter = useCallback(
		(primaryValue: string, secondaryValue: string, searchTerm: string) => {
			setFirstSelection(primaryValue);
			setSecondSelection(secondaryValue);
			setTerm(searchTerm);
			setPage(0);
		},
		[],
	);

	const onSyncedChanged = (event: ChangeEvent<HTMLInputElement>) => {
		event.stopPropagation();

		const entity = entities?.find((e) => e.id === event.target.value);

		if (entity) {
			setSyncStatus(entity.entity_id, event.target.checked);
		}
	};

	const handlePublishChanges = () => {
		setShowConfirmDialog(true);
	};

	const confirmPublish = () => {
		// Get synced entity IDs for publishing
		const entityIds = getSyncedEntityIds();

		publishMutation.mutate(
			{ entityIds, entityConfig: getEntityConfigChanges() },
			{
				onSuccess: (data) => {
					setShowConfirmDialog(false);
					if (!data.changed) {
						toast.success("Nothing to publish, configuration is up to date.");
						return;
					}
					toast.success(
						`Saved! ${data.entitiesCount} ${data.entitiesCount === 1 ? "entity" : "entities"} shared with Alexa.`,
					);
					setShowRestartDialog(true);
				},
				onError: (error) => {
					setShowConfirmDialog(false);
					console.error("Error publishing changes:", error);
					toast.error(
						`Error: ${(error as Error).message}. Please check the logs and try again.`,
						{
							duration: 6000,
						},
					);
				},
			},
		);
	};

	const cancelPublish = () => {
		setShowConfirmDialog(false);
	};

	const confirmRestart = async () => {
		try {
			await haCoreMutation.mutateAsync("check");
			await haCoreMutation.mutateAsync("restart");
			setShowRestartDialog(false);
			toast.success(
				"Home Assistant is restarting. Then ask Alexa to discover devices.",
				{ duration: 8000 },
			);
		} catch (error) {
			setShowRestartDialog(false);
			toast.error(`Not restarted: ${(error as Error).message}`, {
				duration: 8000,
			});
		}
	};

	const cancelRestart = () => {
		setShowRestartDialog(false);
		toast("Remember to restart Home Assistant to apply the changes.", {
			icon: "ℹ️",
			duration: 6000,
		});
	};

	const handleReloadDevices = async () => {
		if (
			pendingChanges.total > 0 &&
			!window.confirm("Reloading will discard your unpublished changes.")
		) {
			return;
		}
		const result = await refetch();
		if (result.isSuccess) {
			toast.success("Devices reloaded from Home Assistant", {
				duration: 2000,
			});
		}
	};

	const setVisibleSyncStatus = (synced: boolean) => {
		setSyncStatus(
			filtered.map((item) => item.entity_id),
			synced,
		);
	};

	const proactiveEvents = alexaSettings?.proactiveEvents ?? false;
	const entityById = new Map((entities ?? []).map((e) => [e.id, e]));
	const editingEntity = entities?.find((e) => e.entity_id === editingEntityId);
	const editedIds = new Set(Object.keys(getEntityConfigChanges()));

	const compatibilityFor = (entityId: string) => {
		const compatibility = entities?.find(
			(e) => e.entity_id === entityId,
		)?.compatibility;
		if (!compatibility || !proactiveEvents) return compatibility;
		return {
			...compatibility,
			warnings: compatibility.warnings.filter((w) => w !== PROACTIVE_WARNING),
		};
	};

	const renderAlexa = (row: Row) => {
		const entity = entityById.get(row.id);
		if (!entity) return null;
		return (
			<AlexaCell
				entityId={entity.entity_id}
				compatibility={compatibilityFor(entity.entity_id)}
				config={getAlexaConfig(entity.entity_id)}
				edited={editedIds.has(entity.entity_id)}
				onEdit={() => setEditingEntityId(entity.entity_id)}
			/>
		);
	};

	const saveSettings = (update: AlexaSettingsUpdate) => {
		if (Object.keys(update).length === 0) {
			setShowSettings(false);
			return;
		}
		settingsMutation.mutate(update, {
			onSuccess: () => {
				setShowSettings(false);
				toast.success("Alexa settings saved");
				setShowRestartDialog(true);
			},
			onError: (error) => toast.error((error as Error).message),
		});
	};

	const migrateSecrets = () => {
		migrateMutation.mutate(undefined, {
			onSuccess: (data) => {
				toast.success(`Moved ${data.migrated.join(", ")} to secrets.yaml`);
				setShowRestartDialog(true);
			},
			onError: (error) => toast.error((error as Error).message),
		});
	};

	const needle = term.trim().toLowerCase();
	const filtered = filter(
		entities?.map(({ id, name, device, entity_id, entity_category, area }) => ({
			id,
			entity_id,
			entity_category,
			shared: isSynced(entity_id),
			name: name?.trim() ?? "",
			alexa_name: getAlexaConfig(entity_id).name ?? "",
			device_name: device.name?.trim() ?? "",
			manufacturer: device.manufacturer ?? "",
			model: device.model ?? "",
			area: area?.name ?? "",
			domain: entity_id.split(".")[0],
		})),
		(item) =>
			(needle === "" ||
				[
					item.name,
					item.alexa_name,
					item.device_name,
					item.manufacturer,
					item.entity_id,
				].some((value) => value.toLowerCase().includes(needle))) &&
			(show === "all" ||
				(show === "synced" && item.shared) ||
				(show === "unsynced" && !item.shared)) &&
			(secondSelection === "" ||
				item[firstSelection as keyof typeof item] === secondSelection),
	);
	const sorted = orderBy(
		filtered,
		sortBy,
		sortDirection === 1 ? "asc" : "desc",
	);
	const pages =
		itemsPerPage === "all"
			? ([sorted] as unknown as Row[][])
			: (chunk(sorted, itemsPerPage) as unknown as Row[][]);
	const data = pages.length > 0 ? pages : [[]];
	// Filters can shrink the result set below the current page
	const currentPage = Math.min(page, data.length - 1);

	return (
		<>
			<Head>
				<title>Devices</title>
			</Head>
			<main className="relative grid min-h-[100vh] w-screen p-8 bg-ha-light-bg dark:bg-ha-dark-bg">
				<div className="flex-col gap-2 text-center">
					{
						<Card className="h-full w-full bg-ha-light-card dark:bg-ha-dark-card border border-ha-light-divider dark:border-ha-dark-divider">
							<CardHeader
								floated={false}
								shadow={false}
								className="rounded-none bg-ha-light-card dark:bg-ha-dark-card"
							>
								<SecretsBanner
									secrets={alexaSettings?.secrets ?? []}
									isMigrating={migrateMutation.isPending}
									onMigrate={migrateSecrets}
								/>
								<div className="mb-8 flex items-center justify-between gap-8">
									<div className="text-left">
										<Typography
											variant="h5"
											className="text-ha-light-text dark:text-ha-dark-text"
										>
											Devices
										</Typography>
										<Typography className="mt-1 font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary">
											Select devices to share with Alexa
										</Typography>
										{pendingChanges.total > 0 && (
											<Typography
												variant="small"
												data-testid="pending-changes"
												className="mt-1 font-medium text-ha-primary"
											>
												{pendingChanges.total} unpublished{" "}
												{pendingChanges.total === 1 ? "change" : "changes"} (+
												{pendingChanges.added} / −{pendingChanges.removed}
												{pendingChanges.edited > 0 &&
													` / ${pendingChanges.edited} edited`}
												)
											</Typography>
										)}
									</div>
									<div className="flex shrink-0 flex-col gap-2 sm:flex-row">
										<Button
											variant="text"
											className="flex items-center gap-1 text-ha-primary"
											size="sm"
											onClick={() => setShowSettings(true)}
										>
											<Cog6ToothIcon className="h-4 w-4" />
											Settings
										</Button>
										<Button
											variant="outlined"
											className="flex items-center gap-1 border-ha-primary text-ha-primary hover:bg-ha-primary/10"
											size="sm"
											onClick={handleReloadDevices}
										>
											<ArrowPathIcon className="h-4 w-4" />
											Reload Devices
										</Button>
										{pendingChanges.total > 0 && (
											<Button
												variant="text"
												size="sm"
												className="text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
												onClick={discardChanges}
											>
												Discard
											</Button>
										)}
										<Button
											className="flex items-center gap-1 bg-ha-primary hover:bg-ha-primary-dark"
											size="sm"
											onClick={handlePublishChanges}
											disabled={
												publishMutation.isPending || pendingChanges.total === 0
											}
										>
											<ArrowUpCircleIcon strokeWidth={2} className="h-4 w-4" />{" "}
											{publishMutation.isPending
												? "Publishing..."
												: "Publish Changes"}
										</Button>
									</div>
								</div>
								<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
									<Tabs value="all" className="w-full md:w-max">
										<TabsHeader>
											{tableQuickFilters.map(({ label, value }) => (
												<Tab
													key={value}
													value={value}
													onClick={() => setShow(value as "all")}
												>
													&nbsp;&nbsp;{label}&nbsp;&nbsp;
												</Tab>
											))}
										</TabsHeader>
									</Tabs>
									<SplitSearch filters={filterOptions} onFilter={onFilter} />
								</div>
								<div className="mt-4 flex flex-wrap items-center gap-2 text-left">
									<Typography
										variant="small"
										className="font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
									>
										{filtered.length} shown · {getSyncedCount()} shared
									</Typography>
									<Button
										variant="text"
										size="sm"
										className="text-ha-primary"
										disabled={filtered.length === 0}
										onClick={() => setVisibleSyncStatus(true)}
									>
										Share all shown
									</Button>
									<Button
										variant="text"
										size="sm"
										className="text-ha-primary"
										disabled={filtered.length === 0}
										onClick={() => setVisibleSyncStatus(false)}
									>
										Unshare all shown
									</Button>
								</div>
							</CardHeader>
							<CardBody className="px-0">
								{isSuccess && (
									<div className="max-w-[calc(100vw-4rem)] overflow-x-auto">
										<SortableTable
											columns={createTableHeaders(onSyncedChanged, renderAlexa)}
											data={data[currentPage]}
											onSort={onSort}
										/>
									</div>
								)}
							</CardBody>
							<CardFooter className="flex items-center justify-between border-t border-ha-light-divider dark:border-ha-dark-divider p-4">
								<Typography
									variant="small"
									className="font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
								>
									Page {currentPage + 1} of {data.length}
								</Typography>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<Typography
											variant="small"
											className="font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
										>
											Items per page:
										</Typography>
										<Menu>
											<MenuHandler>
												<Button
													variant="outlined"
													size="sm"
													className="border-ha-light-divider dark:border-ha-dark-divider text-ha-light-text dark:text-ha-dark-text"
												>
													{itemsPerPage === "all" ? "All" : itemsPerPage}
												</Button>
											</MenuHandler>
											<MenuList className="bg-ha-light-card dark:bg-ha-dark-card border-ha-light-divider dark:border-ha-dark-divider">
												{itemsPerPageOptions.map((option) => (
													<MenuItem
														key={option}
														onClick={() => {
															setItemsPerPage(option);
															setPage(0);
														}}
														className="text-ha-light-text dark:text-ha-dark-text hover:bg-ha-light-bg dark:hover:bg-ha-dark-bg"
													>
														{option === "all" ? "All" : option}
													</MenuItem>
												))}
											</MenuList>
										</Menu>
									</div>
									<div className="flex gap-2">
										<Button
											disabled={currentPage === 0}
											variant="outlined"
											size="sm"
											onClick={onPrevPageClick}
											className="border-ha-light-divider dark:border-ha-dark-divider text-ha-light-text dark:text-ha-dark-text"
										>
											Previous
										</Button>
										<Button
											disabled={currentPage + 1 >= data.length}
											variant="outlined"
											size="sm"
											onClick={onNextPageClick}
											className="border-ha-light-divider dark:border-ha-dark-divider text-ha-light-text dark:text-ha-dark-text"
										>
											Next
										</Button>
									</div>
								</div>
							</CardFooter>
						</Card>
					}
				</div>

				<ConfirmDialog
					open={showConfirmDialog}
					title="Publish Changes to Alexa?"
					message={`You are about to publish ${getSyncedCount()} ${getSyncedCount() === 1 ? "entity" : "entities"}${pendingChanges.edited > 0 ? ` and Alexa settings for ${pendingChanges.edited} ${pendingChanges.edited === 1 ? "entity" : "entities"}` : ""} to your Alexa configuration. This will update your Home Assistant configuration file. Do you want to continue?`}
					confirmText="Publish"
					cancelText="Cancel"
					variant="warning"
					onConfirm={confirmPublish}
					onCancel={cancelPublish}
					isLoading={publishMutation.isPending}
				/>

				<ConfirmDialog
					open={showRestartDialog}
					title="Restart Home Assistant?"
					message="Alexa only reads this configuration when Home Assistant starts. The configuration will be checked first and Home Assistant will only restart if it is valid."
					confirmText="Check & restart"
					cancelText="Later"
					variant="warning"
					onConfirm={confirmRestart}
					onCancel={cancelRestart}
					isLoading={haCoreMutation.isPending}
				/>
				{editingEntity && (
					<EntityConfigDialog
						open={editingEntityId !== null}
						entityId={editingEntity.entity_id}
						defaultName={editingEntity.name ?? ""}
						config={getAlexaConfig(editingEntity.entity_id)}
						compatibility={compatibilityFor(editingEntity.entity_id)}
						onSave={(cfg) => {
							setAlexaConfig(editingEntity.entity_id, cfg);
							setEditingEntityId(null);
						}}
						onCancel={() => setEditingEntityId(null)}
					/>
				)}

				<SettingsDialog
					open={showSettings}
					settings={alexaSettings}
					isSaving={settingsMutation.isPending}
					isMigrating={migrateMutation.isPending}
					onSave={saveSettings}
					onMigrate={migrateSecrets}
					onCancel={() => setShowSettings(false)}
				/>
			</main>
		</>
	);
}
