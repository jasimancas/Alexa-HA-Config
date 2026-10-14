import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type FilterOption, SplitSearch } from "./split-search";

const mockFilters: FilterOption[] = [
	{
		label: "Light",
		value: "light",
		children: [
			{ label: "Living Room", value: "living_room" },
			{ label: "Bedroom", value: "bedroom" },
		],
	},
	{
		label: "Switch",
		value: "switch",
		children: [{ label: "Kitchen", value: "kitchen" }],
	},
	{
		label: "Sensor",
		value: "sensor",
		// No children - second dropdown should not appear
	},
];

describe("SplitSearch", () => {
	it("should render search input", () => {
		render(<SplitSearch filters={mockFilters} onFilter={vi.fn()} />);

		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("should render primary dropdown with placeholder when no selection", () => {
		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={vi.fn()}
				primaryPlaceholder="All Domains"
			/>,
		);

		expect(screen.getByText("All Domains")).toBeInTheDocument();
	});

	it("should render secondary dropdown disabled when no primary selection", () => {
		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={vi.fn()}
				secondaryPlaceholder="All Areas"
			/>,
		);

		// Secondary dropdown should be visible but disabled
		const secondaryButton = screen.getByText("All Areas");
		expect(secondaryButton).toBeInTheDocument();
		expect(secondaryButton.closest("button")).toBeDisabled();
	});

	it("should call onFilter when typing in search input", async () => {
		const user = userEvent.setup();
		const onFilter = vi.fn();

		render(<SplitSearch filters={mockFilters} onFilter={onFilter} />);

		const searchInput = screen.getByRole("textbox");
		await user.type(searchInput, "test");

		// onFilter should be called with the search term
		expect(onFilter).toHaveBeenCalledWith("", "", "test");
	});

	it("should call onFilter when selecting a primary option", async () => {
		const user = userEvent.setup();
		const onFilter = vi.fn();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={onFilter}
				primaryPlaceholder="All Domains"
			/>,
		);

		// Click primary dropdown button
		const primaryButton = screen.getByText("All Domains");
		await user.click(primaryButton);

		// Click on Light option
		const lightOption = screen.getByText("Light");
		await user.click(lightOption);

		// onFilter should be called with light value, empty secondary, and empty search term
		expect(onFilter).toHaveBeenCalledWith("light", "", "");
	});

	it("should enable secondary dropdown after selecting primary with children", async () => {
		const user = userEvent.setup();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={vi.fn()}
				primaryPlaceholder="All Domains"
				secondaryPlaceholder="All Areas"
			/>,
		);

		// Secondary should be disabled initially
		const secondaryButton = screen.getByText("All Areas");
		expect(secondaryButton.closest("button")).toBeDisabled();

		// Click primary dropdown and select Light (which has children)
		const primaryButton = screen.getByText("All Domains");
		await user.click(primaryButton);

		const lightOption = screen.getByText("Light");
		await user.click(lightOption);

		// Secondary dropdown should now be enabled
		expect(secondaryButton.closest("button")).not.toBeDisabled();
	});

	it("should disable secondary dropdown when primary has no children", async () => {
		const user = userEvent.setup();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={vi.fn()}
				primaryPlaceholder="All Domains"
				secondaryPlaceholder="All Areas"
			/>,
		);

		// Click primary dropdown and select Sensor (which has no children)
		const primaryButton = screen.getByText("All Domains");
		await user.click(primaryButton);

		const sensorOption = screen.getByText("Sensor");
		await user.click(sensorOption);

		// Secondary dropdown should be visible but disabled
		const secondaryButton = screen.getByText("All Areas");
		expect(secondaryButton).toBeInTheDocument();
		expect(secondaryButton.closest("button")).toBeDisabled();
	});

	it("should call onFilter when selecting a secondary option", async () => {
		const user = userEvent.setup();
		const onFilter = vi.fn();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={onFilter}
				primaryPlaceholder="All Domains"
				secondaryPlaceholder="All Areas"
			/>,
		);

		// Select primary first
		const primaryButton = screen.getByText("All Domains");
		await user.click(primaryButton);
		await user.click(screen.getByText("Light"));

		// Now click secondary dropdown
		const secondaryButton = screen.getByText("All Areas");
		await user.click(secondaryButton);

		// Select Living Room
		const livingRoomOption = screen.getByText("Living Room");
		await user.click(livingRoomOption);

		// onFilter should be called with both values
		expect(onFilter).toHaveBeenCalledWith("light", "living_room", "");
	});

	it("should reset secondary selection when primary changes", async () => {
		const user = userEvent.setup();
		const onFilter = vi.fn();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={onFilter}
				primaryPlaceholder="All Domains"
				secondaryPlaceholder="All Areas"
			/>,
		);

		// Select primary and secondary
		await user.click(screen.getByText("All Domains"));
		await user.click(screen.getByText("Light"));
		await user.click(screen.getByText("All Areas"));
		await user.click(screen.getByText("Living Room"));

		// Now change primary - use getAllByText and get the button (first one)
		const lightButtons = screen.getAllByText("Light");
		await user.click(lightButtons[0]); // Click the button to open dropdown
		await user.click(screen.getByText("Switch"));

		// Secondary should be reset - onFilter called with empty secondary
		expect(onFilter).toHaveBeenLastCalledWith("switch", "", "");
	});

	it("should start with empty search term", () => {
		render(<SplitSearch filters={mockFilters} onFilter={vi.fn()} />);

		const searchInput = screen.getByRole("textbox") as HTMLInputElement;
		expect(searchInput.value).toBe("");
	});

	it("should call onFilter with empty values on initial render", () => {
		const onFilter = vi.fn();

		render(<SplitSearch filters={mockFilters} onFilter={onFilter} />);

		// useEffect should call onFilter on mount with empty values
		expect(onFilter).toHaveBeenCalledWith("", "", "");
	});

	it("should reset reset search when secondary changes to no selection", async () => {
		const onFilter = vi.fn();
		const user = userEvent.setup();

		render(
			<SplitSearch
				filters={mockFilters}
				onFilter={onFilter}
				primaryPlaceholder="All Stuff"
				secondaryPlaceholder="All Other Stuff"
			/>,
		);

		await user.click(screen.getByText("All Stuff"));
		await user.click(screen.getByText("Light"));
		await user.click(screen.getByText("All Other Stuff"));
		await user.click(screen.getByText("Living Room"));

		expect(onFilter).toHaveBeenLastCalledWith("light", "living_room", "");

		await user.click(screen.getByText("All Other Stuff"));
		expect(onFilter).toHaveBeenLastCalledWith("light", "", "");

		await user.click(screen.getByText("All Stuff"));
		expect(onFilter).toHaveBeenLastCalledWith("", "", "");
	});
});
