import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import type { CompiledEntity } from "@/types/items.types";

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

const mockToast = vi.fn();

vi.mock("react-hot-toast", () => ({
	default: Object.assign(
		(msg: string, opts?: unknown) => mockToast(msg, opts),
		{
			success: (msg: string, opts?: unknown) => mockToastSuccess(msg, opts),
			error: (msg: string, opts?: unknown) => mockToastError(msg, opts),
		},
	),
}));

const mockMutate = vi.fn();
const mockRefetch = vi.fn();
const mockSetSyncStatus = vi.fn();
const mockGetSyncedEntityIds = vi.fn(() => ["light.living_room"]);
const mockGetSyncedCount = vi.fn(() => 1);
const mockDiscardChanges = vi.fn();
const mockHaCoreMutateAsync = vi.fn();
const mockSetAlexaConfig = vi.fn();
const mockSettingsMutate = vi.fn();
const mockMigrateMutate = vi.fn();
let mockAlexaSettings: Record<string, unknown> | undefined;

type MockUseGetEntitiesReturn = {
	data: CompiledEntity[] | undefined;
	isLoading: boolean;
	isSuccess: boolean;
	isError: boolean;
	error: Error | null;
	refetch: Mock;
	setSyncStatus: Mock;
	getSyncedEntityIds: Mock<() => string[]>;
	getSyncedCount: Mock<() => number>;
	isSynced: (id: string) => boolean;
	pendingChanges: {
		added: number;
		removed: number;
		edited?: number;
		total: number;
	};
	discardChanges: Mock;
	getAlexaConfig: (id: string) => Record<string, string>;
	getEntityConfigChanges: () => Record<string, unknown>;
};

const createMockUseGetEntities = (
	overrides: Partial<MockUseGetEntitiesReturn> = {},
) => ({
	data: [] as CompiledEntity[],
	isLoading: false,
	isSuccess: true,
	isError: false,
	error: null,
	refetch: mockRefetch,
	setSyncStatus: mockSetSyncStatus,
	getSyncedEntityIds: mockGetSyncedEntityIds,
	getSyncedCount: mockGetSyncedCount,
	isSynced: (id: string) =>
		(overrides.data ?? []).some((e) => e.entity_id === id && e.shared),
	pendingChanges: { added: 1, removed: 0, edited: 0, total: 1 },
	discardChanges: mockDiscardChanges,
	getAlexaConfig: (id: string) =>
		(overrides.data ?? []).find((e) => e.entity_id === id)?.alexa ?? {},
	setAlexaConfig: mockSetAlexaConfig,
	getEntityConfigChanges: () => ({}),
	...overrides,
});

vi.mock("@/queries/use-get-entities.query", () => ({
	useGetEntities: vi.fn(() => createMockUseGetEntities()),
}));

vi.mock("@/mutations/use-alexa-config.mutation", () => ({
	usePublishAlexaConfig: vi.fn(() => ({
		mutate: mockMutate,
		isPending: false,
	})),
	useHaCoreAction: vi.fn(() => ({
		mutateAsync: mockHaCoreMutateAsync,
		isPending: false,
	})),
	useAlexaSettings: vi.fn(() => ({ data: mockAlexaSettings })),
	useUpdateAlexaSettings: vi.fn(() => ({
		mutate: mockSettingsMutate,
		isPending: false,
	})),
	useMigrateSecrets: vi.fn(() => ({
		mutate: mockMigrateMutate,
		isPending: false,
	})),
}));

import { usePublishAlexaConfig } from "@/mutations/use-alexa-config.mutation";
import { useGetEntities } from "@/queries/use-get-entities.query";
import Home from "../../pages/index";

const mockEntities: CompiledEntity[] = [
	{
		id: "entity-1",
		entity_id: "light.living_room",
		name: "Living Room Light",
		entity_category: null,
		shared: true,
		device: {
			id: "device-1",
			name: "Philips Hue",
			manufacturer: "Philips",
			model: "Hue Bulb",
		},
		area: {
			area_id: "area-1",
			name: "Living Room",
		},
	},
	{
		id: "entity-2",
		entity_id: "switch.bedroom",
		name: "Bedroom Switch",
		entity_category: null,
		shared: false,
		device: {
			id: "device-2",
			name: "Smart Switch",
			manufacturer: "TP-Link",
			model: "Kasa",
		},
		area: {
			area_id: "area-2",
			name: "Bedroom",
		},
	},
];

const mockEntitiesWithNulls: CompiledEntity[] = [
	{
		id: "entity-3",
		entity_id: "sensor.temp",
		name: null as unknown as string,
		entity_category: null,
		shared: false,
		device: {
			id: "device-3",
			name: null as unknown as string,
			manufacturer: null as unknown as string,
			model: null as unknown as string,
		},
		area: null as unknown as { area_id: string; name: string },
	},
];

const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

const renderWithProviders = (ui: React.ReactElement) => {
	const queryClient = createQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
};

const mockUseGetEntities = (
	overrides: Partial<MockUseGetEntitiesReturn> = {},
) => {
	vi.mocked(useGetEntities).mockReturnValue(
		createMockUseGetEntities(overrides) as unknown as ReturnType<
			typeof useGetEntities
		>,
	);
};

describe("Home Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});

		mockUseGetEntities({ data: mockEntities });

		vi.mocked(usePublishAlexaConfig).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<typeof usePublishAlexaConfig>);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Rendering", () => {
		it("should render the page title", () => {
			renderWithProviders(<Home />);
			expect(screen.getByText("Devices")).toBeInTheDocument();
		});

		it("should render the page description", () => {
			renderWithProviders(<Home />);
			expect(
				screen.getByText("Select devices to share with Alexa"),
			).toBeInTheDocument();
		});

		it("should render the Reload Devices button", () => {
			renderWithProviders(<Home />);
			expect(screen.getByText("Reload Devices")).toBeInTheDocument();
		});

		it("should render the Publish Changes button", () => {
			renderWithProviders(<Home />);
			expect(screen.getByText("Publish Changes")).toBeInTheDocument();
		});

		it("should render search input", () => {
			renderWithProviders(<Home />);
			expect(screen.getByRole("textbox")).toBeInTheDocument();
		});

		it("should render filter tabs", () => {
			renderWithProviders(<Home />);
			const tabList = screen.getByRole("tablist");
			expect(tabList).toBeInTheDocument();
			expect(screen.getAllByRole("tab")).toHaveLength(3);
		});

		it("should render pagination controls", () => {
			renderWithProviders(<Home />);
			expect(screen.getByText("Previous")).toBeInTheDocument();
			expect(screen.getByText("Next")).toBeInTheDocument();
		});
	});

	describe("Loading State", () => {
		it("should not show table when loading", () => {
			mockUseGetEntities({
				data: undefined,
				isLoading: true,
				isSuccess: false,
			});

			renderWithProviders(<Home />);

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("Success State", () => {
		it("should not spam a toast on successful load", async () => {
			mockToastSuccess.mockClear();

			renderWithProviders(<Home />);

			await new Promise((r) => setTimeout(r, 50));
			expect(mockToastSuccess).not.toHaveBeenCalled();
		});

		it("should render table with entities", () => {
			renderWithProviders(<Home />);

			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should display device names", () => {
			renderWithProviders(<Home />);

			// Device names appear twice due to responsive table layout (collapsed + expanded)
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should display entity IDs", () => {
			renderWithProviders(<Home />);

			expect(screen.getAllByText("light.living_room").length).toEqual(2);
			expect(screen.getAllByText("switch.bedroom").length).toEqual(2);
		});
	});

	describe("Error State", () => {
		it("should show error toast on failure", async () => {
			mockToastSuccess.mockClear();
			mockToastError.mockClear();

			mockUseGetEntities({
				data: undefined,
				isLoading: false,
				isSuccess: false,
				isError: true,
				error: new Error("Failed to load entities"),
			});

			renderWithProviders(<Home />);

			await waitFor(() => {
				expect(mockToastError).toHaveBeenCalledWith(
					"Failed to load entities",
					undefined,
				);
			});
		});

		it("should show generic error when no message", async () => {
			mockToastSuccess.mockClear();
			mockToastError.mockClear();

			mockUseGetEntities({
				data: undefined,
				isLoading: false,
				isSuccess: false,
				isError: true,
				error: null,
			});

			renderWithProviders(<Home />);

			await waitFor(() => {
				expect(mockToastError).toHaveBeenCalledWith("Error", undefined);
			});
		});
	});

	describe("Search Functionality", () => {
		it("should filter entities by search term", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const searchInput = screen.getByRole("textbox");
			await user.type(searchInput, "Philips");

			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.queryByText("Smart Switch")).not.toBeInTheDocument();
		});

		it("should filter by entity ID", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const searchInput = screen.getByRole("textbox");
			await user.type(searchInput, "light.living");

			// Should show Philips Hue (device name for light.living_room)
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			// Should not show Smart Switch (device name for switch.bedroom)
			expect(screen.queryByText("Smart Switch")).not.toBeInTheDocument();
		});

		it("should filter by manufacturer", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const searchInput = screen.getByRole("textbox");
			await user.type(searchInput, "TP-Link");

			expect(screen.queryByText("Philips Hue")).not.toBeInTheDocument();
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should reset to page 0 when searching", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const searchInput = screen.getByRole("textbox");
			await user.type(searchInput, "test");

			expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
		});

		it("should filter by domain using dropdown filters", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			// Both entities should be visible initially
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);

			// Find the primary dropdown button (first "All" text that's in a button)
			const allTexts = screen.getAllByText("All");
			// First one is the tab, find the button one
			const primaryDropdown = allTexts
				.map((el) => el.closest("button"))
				.find((btn) => btn !== null) as HTMLButtonElement;
			expect(primaryDropdown).not.toBeNull();
			await user.click(primaryDropdown);

			// Select "Domain" from the dropdown menu item
			const domainMenuItems = screen.getAllByText("Domain");
			await user.click(domainMenuItems[0]);

			// Find secondary dropdown - it's the button with "All" text after Domain is selected
			const secondaryAllTexts = screen.getAllByText("All");
			const secondaryDropdown = secondaryAllTexts
				.map((el) => el.closest("button"))
				.find((btn) => btn !== null) as HTMLButtonElement;
			expect(secondaryDropdown).not.toBeNull();
			await user.click(secondaryDropdown);

			// Select "Light" from the secondary dropdown
			const lightMenuItems = screen.getAllByText("Light");
			await user.click(lightMenuItems[0]);

			// Only light entities should be visible (Philips Hue)
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.queryByText("Smart Switch")).not.toBeInTheDocument();
		});
	});

	describe("Tab Filtering", () => {
		it("should show all entities by default", () => {
			renderWithProviders(<Home />);

			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should filter synced entities when Synced tab clicked", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const tabs = screen.getAllByRole("tab");
			const syncedTab = tabs.find(
				(tab) =>
					tab.textContent?.includes("Synced") &&
					!tab.textContent?.includes("Unsynced"),
			);
			if (syncedTab) {
				await user.click(syncedTab);
			}

			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.queryByText("Smart Switch")).not.toBeInTheDocument();
		});

		it("should filter unsynced entities when Unsynced tab clicked", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const tabs = screen.getAllByRole("tab");
			const unsyncedTab = tabs.find((tab) =>
				tab.textContent?.includes("Unsynced"),
			);
			if (unsyncedTab) {
				await user.click(unsyncedTab);
			}

			expect(screen.queryByText("Philips Hue")).not.toBeInTheDocument();
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});
	});

	describe("Pagination", () => {
		it("should disable Previous button on first page", () => {
			renderWithProviders(<Home />);

			const prevButton = screen.getByText("Previous");
			expect(prevButton).toBeDisabled();
		});

		it("should show correct page info", () => {
			renderWithProviders(<Home />);

			expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
		});
	});

	describe("Reload Devices", () => {
		it("should call refetch when Reload Devices clicked", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			mockRefetch.mockResolvedValue({ isSuccess: true });
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const reloadButton = screen.getByText("Reload Devices");
			await user.click(reloadButton);

			expect(mockRefetch).toHaveBeenCalled();
		});

		it("should show toast when reloading", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			mockRefetch.mockResolvedValue({ isSuccess: true });
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const reloadButton = screen.getByText("Reload Devices");
			await user.click(reloadButton);

			expect(mockToastSuccess).toHaveBeenCalledWith(
				"Devices reloaded from Home Assistant",
				{ duration: 2000 },
			);
		});

		it("should not reload when the user keeps unpublished changes", async () => {
			vi.spyOn(window, "confirm").mockReturnValue(false);
			mockRefetch.mockClear();
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			await user.click(screen.getByText("Reload Devices"));

			expect(mockRefetch).not.toHaveBeenCalled();
		});
	});

	describe("Publish Changes", () => {
		it("should open confirm dialog when Publish Changes clicked", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			expect(screen.getByText("Publish Changes to Alexa?")).toBeInTheDocument();
		});

		it("should show entity count in confirm dialog", async () => {
			const user = userEvent.setup();
			mockGetSyncedCount.mockReturnValue(5);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			expect(screen.getByText(/5 entities/)).toBeInTheDocument();
		});

		it("should use singular entity when count is 1", async () => {
			const user = userEvent.setup();
			mockGetSyncedCount.mockReturnValue(1);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			expect(screen.getByText(/1 entity to your Alexa/)).toBeInTheDocument();
		});

		it("should call mutate with entity IDs when confirmed", async () => {
			const user = userEvent.setup();
			mockGetSyncedEntityIds.mockReturnValue([
				"light.living_room",
				"switch.bedroom",
			]);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			const confirmButton = screen.getByText("Publish");
			await user.click(confirmButton);

			expect(mockMutate).toHaveBeenCalledWith(
				{
					entityIds: ["light.living_room", "switch.bedroom"],
					entityConfig: {},
				},
				expect.objectContaining({
					onSuccess: expect.any(Function),
					onError: expect.any(Function),
				}),
			);
		});

		it("should close dialog when cancelled", async () => {
			const user = userEvent.setup();
			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			expect(screen.getByText("Publish Changes to Alexa?")).toBeInTheDocument();

			const cancelButton = screen.getByText("Cancel");
			await user.click(cancelButton);

			await waitFor(() => {
				expect(
					screen.queryByText("Publish Changes to Alexa?"),
				).not.toBeInTheDocument();
			});
		});

		it("should show Publishing... when pending", () => {
			vi.mocked(usePublishAlexaConfig).mockReturnValue({
				mutate: mockMutate,
				isPending: true,
			} as unknown as ReturnType<typeof usePublishAlexaConfig>);

			renderWithProviders(<Home />);

			expect(screen.getByText("Publishing...")).toBeInTheDocument();
		});

		it("should disable button when pending", () => {
			vi.mocked(usePublishAlexaConfig).mockReturnValue({
				mutate: mockMutate,
				isPending: true,
			} as unknown as ReturnType<typeof usePublishAlexaConfig>);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publishing...");
			expect(publishButton.closest("button")).toBeDisabled();
		});

		it("should show success toast on successful publish", async () => {
			const user = userEvent.setup();
			mockMutate.mockImplementation(
				(
					_entityIds: string[],
					options: {
						onSuccess: (data: {
							entitiesCount: number;
							changed: boolean;
						}) => void;
					},
				) => {
					options.onSuccess({ entitiesCount: 3, changed: true });
				},
			);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			const confirmButton = screen.getByText("Publish");
			await user.click(confirmButton);

			expect(mockToastSuccess).toHaveBeenCalledWith(
				"Saved! 3 entities shared with Alexa.",
				undefined,
			);
			expect(screen.getByText("Restart Home Assistant?")).toBeInTheDocument();
		});

		it("should check config then restart HA when confirmed", async () => {
			const user = userEvent.setup();
			mockHaCoreMutateAsync.mockReset().mockResolvedValue(undefined);
			mockMutate.mockImplementation((_ids, options) =>
				options.onSuccess({ entitiesCount: 1, changed: true }),
			);

			renderWithProviders(<Home />);
			await user.click(screen.getByText("Publish Changes"));
			await user.click(screen.getByText("Publish"));
			await user.click(screen.getByText("Check & restart"));

			expect(mockHaCoreMutateAsync.mock.calls).toEqual([
				["check"],
				["restart"],
			]);
			expect(mockToastSuccess).toHaveBeenCalledWith(
				expect.stringContaining("restarting"),
				expect.anything(),
			);
		});

		it("should not restart when the config check fails", async () => {
			const user = userEvent.setup();
			mockHaCoreMutateAsync
				.mockReset()
				.mockRejectedValueOnce(new Error("Invalid config"));
			mockMutate.mockImplementation((_ids, options) =>
				options.onSuccess({ entitiesCount: 1, changed: true }),
			);

			renderWithProviders(<Home />);
			await user.click(screen.getByText("Publish Changes"));
			await user.click(screen.getByText("Publish"));
			await user.click(screen.getByText("Check & restart"));

			expect(mockHaCoreMutateAsync).toHaveBeenCalledTimes(1);
			expect(mockToastError).toHaveBeenCalledWith(
				"Not restarted: Invalid config",
				expect.anything(),
			);
		});

		it("should not offer a restart when nothing changed", async () => {
			const user = userEvent.setup();
			mockMutate.mockImplementation((_ids, options) =>
				options.onSuccess({ entitiesCount: 1, changed: false }),
			);

			renderWithProviders(<Home />);
			await user.click(screen.getByText("Publish Changes"));
			await user.click(screen.getByText("Publish"));

			expect(
				screen.queryByText("Restart Home Assistant?"),
			).not.toBeInTheDocument();
		});

		it("should show error toast on failed publish", async () => {
			const user = userEvent.setup();
			mockMutate.mockImplementation(
				(
					_entityIds: string[],
					options: { onError: (error: Error) => void },
				) => {
					options.onError(new Error("Network error"));
				},
			);

			renderWithProviders(<Home />);

			const publishButton = screen.getByText("Publish Changes");
			await user.click(publishButton);

			const confirmButton = screen.getByText("Publish");
			await user.click(confirmButton);

			expect(mockToastError).toHaveBeenCalledWith(
				expect.stringContaining("Network error"),
				expect.objectContaining({ duration: 6000 }),
			);
		});
	});

	describe("Sync Toggle", () => {
		it("should call setSyncStatus when checkbox changed", async () => {
			renderWithProviders(<Home />);

			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				expect(mockSetSyncStatus).toHaveBeenCalled();
			});
		});

		it("should not call setSyncStatus when entity not found", async () => {
			renderWithProviders(<Home />);

			const checkboxes = screen.getAllByRole("checkbox");
			// Modify the checkbox value to a non-existent entity ID
			checkboxes[0].setAttribute("value", "non-existent-id");
			fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				// setSyncStatus should not be called for non-existent entity
				expect(mockSetSyncStatus).not.toHaveBeenCalled();
			});
		});
	});

	describe("Sorting", () => {
		it("should render sortable table headers", () => {
			renderWithProviders(<Home />);

			expect(screen.getByText("Device")).toBeInTheDocument();
			expect(screen.getByText("Entity Id")).toBeInTheDocument();
			expect(screen.getByText("Manufacturer")).toBeInTheDocument();
			expect(screen.getByText("Area")).toBeInTheDocument();
		});

		it("should sort when clicking a sort button", async () => {
			const user = userEvent.setup();
			const { container } = renderWithProviders(<Home />);

			// Get sort buttons (IconButtons with ChevronUpDownIcon)
			const sortButtons = container.querySelectorAll("table button");
			expect(sortButtons.length).toBeGreaterThan(0);

			// Click the first sort button (Device column)
			await user.click(sortButtons[0]);

			// The table should still display both device names
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should reverse sort direction when clicking same column twice", async () => {
			const user = userEvent.setup();
			const { container } = renderWithProviders(<Home />);

			// Get sort buttons
			const sortButtons = container.querySelectorAll("table button");

			// Click the first sort button twice to reverse sort direction
			await user.click(sortButtons[0]);
			await user.click(sortButtons[0]);

			// Both entities should still be visible, just in different order
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});

		it("should change sort column when clicking different header", async () => {
			const user = userEvent.setup();
			const { container } = renderWithProviders(<Home />);

			// Get sort buttons
			const sortButtons = container.querySelectorAll("table button");

			// First click on first sort button (Device column)
			await user.click(sortButtons[0]);

			// Then click on second sort button (Name column) to change sort column
			await user.click(sortButtons[1]);

			// Both entities should still be visible
			expect(screen.getAllByText("Philips Hue").length).toEqual(2);
			expect(screen.getAllByText("Smart Switch").length).toEqual(2);
		});
	});

	describe("Entities with null values", () => {
		it("should handle entities with null properties", () => {
			mockUseGetEntities({ data: mockEntitiesWithNulls });
			renderWithProviders(<Home />);

			// Should render without crashing, with fallback values
			expect(screen.getByText("Devices")).toBeInTheDocument();
		});

		it("should handle entity without area", () => {
			const entityWithoutArea: CompiledEntity = {
				id: "entity-no-area",
				entity_id: "light.no_area",
				name: "No Area Light",
				entity_category: null,
				shared: false,
				device: {
					id: "device-4",
					name: "Test Device",
					manufacturer: "Test",
					model: "Model",
				},
				area: null as unknown as { area_id: string; name: string },
			};
			mockUseGetEntities({ data: [entityWithoutArea] });
			renderWithProviders(<Home />);

			// Table displays device.name, not entity name
			expect(screen.getAllByText("Test Device").length).toEqual(2);
		});
	});

	describe("Pagination Navigation", () => {
		const manyEntities: CompiledEntity[] = Array.from(
			{ length: 25 },
			(_, i) => ({
				id: `entity-${i + 1}`,
				entity_id: `light.entity_${i + 1}`,
				name: `Entity ${i + 1}`,
				entity_category: null,
				shared: i % 2 === 0,
				device: {
					id: `device-${i + 1}`,
					name: `Device ${i + 1}`,
					manufacturer: `Manufacturer ${i + 1}`,
					model: `Model ${i + 1}`,
				},
				area: {
					area_id: `area-${i + 1}`,
					name: `Area ${i + 1}`,
				},
			}),
		);

		it("should enable Next button when more pages exist", () => {
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			const nextButton = screen.getByText("Next");
			expect(nextButton).not.toBeDisabled();
		});

		it("should navigate to next page when Next clicked", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

			const nextButton = screen.getByText("Next");
			await user.click(nextButton);

			expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
		});

		it("should navigate to previous page when Previous clicked", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// Go to page 2 first
			const nextButton = screen.getByText("Next");
			await user.click(nextButton);
			expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();

			// Then go back to page 1
			const prevButton = screen.getByText("Previous");
			await user.click(prevButton);
			expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
		});

		it("should disable Next button on last page", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			const nextButton = screen.getByText("Next");
			// Navigate to last page
			await user.click(nextButton);
			await user.click(nextButton);

			expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument();
			expect(nextButton).toBeDisabled();
		});

		it("should enable Previous button after navigating from first page", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			const prevButton = screen.getByText("Previous");
			expect(prevButton).toBeDisabled();

			const nextButton = screen.getByText("Next");
			await user.click(nextButton);

			expect(prevButton).not.toBeDisabled();
		});
	});

	describe("Items Per Page", () => {
		const manyEntities: CompiledEntity[] = Array.from(
			{ length: 25 },
			(_, i) => ({
				id: `entity-${i + 1}`,
				entity_id: `light.entity_${i + 1}`,
				name: `Entity ${i + 1}`,
				entity_category: null,
				shared: i % 2 === 0,
				device: {
					id: `device-${i + 1}`,
					name: `Device ${i + 1}`,
					manufacturer: `Manufacturer ${i + 1}`,
					model: `Model ${i + 1}`,
				},
				area: {
					area_id: `area-${i + 1}`,
					name: `Area ${i + 1}`,
				},
			}),
		);

		it("should render items per page dropdown", () => {
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			expect(screen.getByText("Items per page:")).toBeInTheDocument();
		});

		it("should default to 10 items per page", () => {
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// 25 items with 10 per page = 3 pages
			expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
		});

		it("should change items per page when selecting 20", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// Open the items per page dropdown
			const itemsPerPageButton = screen
				.getByText("10")
				.closest("button") as HTMLButtonElement;
			await user.click(itemsPerPageButton);

			// Select 20
			const option20 = screen.getByRole("menuitem", { name: "20" });
			await user.click(option20);

			// 25 items with 20 per page = 2 pages
			expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
		});

		it("should show all items on one page when selecting All", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// Open the items per page dropdown
			const itemsPerPageButton = screen
				.getByText("10")
				.closest("button") as HTMLButtonElement;
			await user.click(itemsPerPageButton);

			// Select All - find the menu item specifically
			const allOption = screen.getByRole("menuitem", { name: "All" });
			await user.click(allOption);

			// All items on one page
			expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
		});

		it("should reset to page 1 when changing items per page", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// Navigate to page 2
			const nextButton = screen.getByText("Next");
			await user.click(nextButton);
			expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();

			// Open the items per page dropdown
			const itemsPerPageButton = screen
				.getByText("10")
				.closest("button") as HTMLButtonElement;
			await user.click(itemsPerPageButton);

			// Select 50
			const option50 = screen.getByRole("menuitem", { name: "50" });
			await user.click(option50);

			// Should be back on page 1
			expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
		});

		it("should display current items per page value in button", async () => {
			const user = userEvent.setup();
			mockUseGetEntities({ data: manyEntities });
			renderWithProviders(<Home />);

			// Open the items per page dropdown and select 50
			const itemsPerPageButton = screen
				.getByText("10")
				.closest("button") as HTMLButtonElement;
			await user.click(itemsPerPageButton);

			const option50 = screen.getByRole("menuitem", { name: "50" });
			await user.click(option50);

			// Button should now show 50 - find the button with aria-haspopup="menu"
			const allFifty = screen.getAllByText("50");
			const updatedButton = allFifty.find(
				(el) => el.closest("button")?.getAttribute("aria-haspopup") === "menu",
			);
			expect(updatedButton).toBeInTheDocument();
		});
	});
});

describe("Home Page improvements", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({ data: mockEntities }),
		);
	});

	it("does not crash on regex special characters in search", async () => {
		renderWithProviders(<Home />);

		fireEvent.change(screen.getAllByRole("textbox")[0], {
			target: { value: "(light[" },
		});

		await waitFor(() => {
			expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
		});
	});

	it("searches by entity name", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Home />);

		await user.type(screen.getAllByRole("textbox")[0], "bedroom switch");

		await waitFor(() => {
			expect(screen.queryByText("light.living_room")).not.toBeInTheDocument();
		});
	});

	it("shares all shown entities at once", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Home />);

		await user.click(screen.getByText("Share all shown"));

		expect(mockSetSyncStatus).toHaveBeenCalledWith(
			["light.living_room", "switch.bedroom"],
			true,
		);
	});

	it("unshares all shown entities at once", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Home />);

		await user.click(screen.getByText("Unshare all shown"));

		expect(mockSetSyncStatus).toHaveBeenCalledWith(
			["light.living_room", "switch.bedroom"],
			false,
		);
	});

	it("shows pending changes and allows discarding them", async () => {
		const user = userEvent.setup();
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({
				data: mockEntities,
				pendingChanges: { added: 2, removed: 1, total: 3 },
			}),
		);
		renderWithProviders(<Home />);

		expect(screen.getByTestId("pending-changes")).toHaveTextContent(
			"3 unpublished changes",
		);
		await user.click(screen.getByText("Discard"));
		expect(mockDiscardChanges).toHaveBeenCalled();
	});

	it("disables publishing when there is nothing to publish", () => {
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({
				data: mockEntities,
				pendingChanges: { added: 0, removed: 0, total: 0 },
			}),
		);
		renderWithProviders(<Home />);

		expect(
			screen.getByText("Publish Changes").closest("button"),
		).toBeDisabled();
		expect(screen.queryByText("Discard")).not.toBeInTheDocument();
	});

	it("reflects local selection in the switches", () => {
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({
				data: mockEntities,
				isSynced: (id: string) => id === "switch.bedroom",
			}),
		);
		renderWithProviders(<Home />);

		expect(
			screen.getAllByLabelText("Share switch.bedroom with Alexa")[0],
		).toBeChecked();
		expect(
			screen.getAllByLabelText("Share light.living_room with Alexa")[0],
		).not.toBeChecked();
	});
});

describe("Home Page Alexa features", () => {
	const entitiesWithAlexa: CompiledEntity[] = mockEntities.map((e, i) => ({
		...e,
		alexa: i === 0 ? { name: "Luz del salón" } : {},
		compatibility:
			i === 0
				? {
						supported: true,
						capabilities: ["On/off", "Brightness"],
						warnings: [],
					}
				: {
						supported: false,
						capabilities: [],
						warnings: ["Not usable here"],
					},
	}));

	beforeEach(() => {
		vi.clearAllMocks();
		mockAlexaSettings = undefined;
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({ data: entitiesWithAlexa }),
		);
	});

	it("shows Alexa name, capabilities and compatibility warnings", () => {
		renderWithProviders(<Home />);
		expect(screen.getAllByText("“Luz del salón”").length).toBeGreaterThan(0);
		expect(screen.getAllByText("On/off, Brightness").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Not usable here").length).toBeGreaterThan(0);
	});

	it("searches by Alexa name", async () => {
		renderWithProviders(<Home />);
		fireEvent.change(screen.getAllByRole("textbox")[0], {
			target: { value: "salón" },
		});
		await waitFor(() => {
			expect(screen.queryByText("switch.bedroom")).not.toBeInTheDocument();
		});
	});

	it("edits the Alexa config of an entity", async () => {
		const user = userEvent.setup();
		renderWithProviders(<Home />);

		await user.click(
			screen.getAllByLabelText("Edit Alexa settings for switch.bedroom")[0],
		);
		await user.type(await screen.findByLabelText("Spoken name"), "Dormitorio");
		fireEvent.change(screen.getByLabelText("Device type"), {
			target: { value: "SMARTPLUG" },
		});
		await user.click(screen.getByText("Apply"));

		expect(mockSetAlexaConfig).toHaveBeenCalledWith("switch.bedroom", {
			name: "Dormitorio",
			description: "",
			display_categories: "SMARTPLUG",
		});
	});

	it("publishes entity config changes together with the selection", async () => {
		const user = userEvent.setup();
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({
				data: entitiesWithAlexa,
				getEntityConfigChanges: () => ({ "switch.bedroom": { name: "X" } }),
				pendingChanges: { added: 0, removed: 0, edited: 1, total: 1 },
			}),
		);
		renderWithProviders(<Home />);

		expect(screen.getByTestId("pending-changes")).toHaveTextContent("1 edited");
		await user.click(screen.getByText("Publish Changes"));
		expect(
			screen.getByText(/and Alexa settings for 1 entity/),
		).toBeInTheDocument();
		await user.click(screen.getByText("Publish"));

		expect(mockMutate.mock.calls[0][0]).toEqual({
			entityIds: mockGetSyncedEntityIds(),
			entityConfig: { "switch.bedroom": { name: "X" } },
		});
	});

	it("warns about plain-text credentials and migrates them", async () => {
		const user = userEvent.setup();
		mockAlexaSettings = {
			locale: "es-ES",
			region: "",
			proactiveEvents: false,
			secrets: [
				{
					key: "client_id",
					path: "alexa.smart_home.client_id",
					state: "plaintext",
				},
			],
		};
		renderWithProviders(<Home />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"1 credential is stored in plain text",
		);
		await user.click(screen.getAllByText("Migrate to secrets.yaml")[0]);
		expect(mockMigrateMutate).toHaveBeenCalled();
	});

	it("hides the banner when credentials are safe", () => {
		mockAlexaSettings = {
			locale: "",
			region: "",
			proactiveEvents: false,
			secrets: [
				{
					key: "client_id",
					path: "alexa.smart_home.client_id",
					state: "secret",
				},
			],
		};
		renderWithProviders(<Home />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("saves settings with only the changed fields", async () => {
		const user = userEvent.setup();
		mockAlexaSettings = {
			locale: "es-ES",
			region: "",
			proactiveEvents: false,
			secrets: [
				{
					key: "client_id",
					path: "alexa.smart_home.client_id",
					state: "secret",
				},
				{
					key: "client_secret",
					path: "alexa.smart_home.client_secret",
					state: "missing",
				},
			],
		};
		renderWithProviders(<Home />);

		await user.click(screen.getByText("Settings"));
		const dialog = await screen.findByText("Proactive events");
		expect(dialog).toBeInTheDocument();
		expect(screen.getByText("Stored in secrets.yaml")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Region"), {
			target: { value: "eu" },
		});
		await user.type(screen.getByLabelText("Client secret"), "shh");
		await user.click(screen.getByText("Save"));

		expect(mockSettingsMutate.mock.calls[0][0]).toEqual({
			region: "eu",
			clientSecret: "shh",
		});
	});

	it("hides the proactive-events hint once they are configured", () => {
		mockAlexaSettings = {
			locale: "",
			region: "eu",
			proactiveEvents: true,
			secrets: [],
		};
		(useGetEntities as Mock).mockReturnValue(
			createMockUseGetEntities({
				data: [
					{
						...mockEntities[0],
						compatibility: {
							supported: true,
							capabilities: ["Motion"],
							warnings: ["Needs proactive events (Settings) to report changes"],
						},
					},
				],
			}),
		);
		renderWithProviders(<Home />);
		expect(
			screen.queryByText("Needs proactive events (Settings) to report changes"),
		).not.toBeInTheDocument();
	});
});
