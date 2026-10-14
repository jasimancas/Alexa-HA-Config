import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Column, type Row, SortableTable } from "./sortable-table";

describe("SortableTable", () => {
	const mockData: Row[] = [
		{ id: "1", name: "John Doe", age: 30, active: true },
		{ id: "2", name: "Jane Smith", age: 25, active: false },
		{ id: "3", name: "Bob Johnson", age: 35, active: true },
	];

	it("should render table with string columns", () => {
		const columns: Column[] = ["name", "age"];

		render(<SortableTable columns={columns} data={mockData} />);

		// Check headers
		expect(screen.getByText("name")).toBeInTheDocument();
		expect(screen.getByText("age")).toBeInTheDocument();

		// Check data
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("Jane Smith")).toBeInTheDocument();
		expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
	});

	it("should render table with composite columns", () => {
		const columns: Column[] = [
			{ label: "Full Name", key: "name" },
			{ label: "Age", key: "age" },
		];

		render(<SortableTable columns={columns} data={mockData} />);

		expect(screen.getByText("Full Name")).toBeInTheDocument();
		expect(screen.getByText("Age")).toBeInTheDocument();
	});

	it("should render sortable columns with sort button", () => {
		const columns: Column[] = [
			{ label: "Name", key: "name", sortable: true },
			{ label: "Age", key: "age" },
		];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} />,
		);

		// Check that sort icon button is present only for sortable column
		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(1); // Only one sortable column
	});

	it("should call onSort when sort button is clicked", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		const columns: Column[] = [
			{ label: "Name", key: "name", sortable: true },
			{ label: "Age", key: "age", sortable: true },
		];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} onSort={onSort} />,
		);

		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(2); // Two sortable columns

		// Click first sort button (name column)
		await user.click(buttons[0]);
		expect(onSort).toHaveBeenCalledWith("name");

		// Click second sort button (age column)
		await user.click(buttons[1]);
		expect(onSort).toHaveBeenCalledWith("age");
		expect(onSort).toHaveBeenCalledTimes(2);
	});

	it("should render image columns with Avatar", () => {
		const dataWithImages: Row[] = [
			{
				id: "1",
				name: "John",
				avatar: { src: "/avatar1.jpg", alt: "John Avatar" },
			},
			{
				id: "2",
				name: "Jane",
				avatar: { src: "/avatar2.jpg", alt: "Jane Avatar" },
			},
		];

		const columns: Column[] = [
			{ label: "Name", key: "name" },
			{ label: "Avatar", key: "avatar" },
		];

		const { container } = render(
			<SortableTable columns={columns} data={dataWithImages} />,
		);

		// Check that avatars are rendered
		const avatars = container.querySelectorAll("img");
		expect(avatars).toHaveLength(2);
		expect(avatars[0]).toHaveAttribute("src", "/avatar1.jpg");
		expect(avatars[0]).toHaveAttribute("alt", "John Avatar");
	});

	it("should render inline switch for boolean values", () => {
		const onChange = vi.fn();
		const columns: Column[] = [
			{ label: "Name", key: "name" },
			{ label: "Active", key: "active", inline: true, onchange: onChange },
		];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} />,
		);

		// Check that switches are rendered
		const switches = container.querySelectorAll('input[type="checkbox"]');
		expect(switches).toHaveLength(3); // One for each row

		// Check switch states
		expect(switches[0]).toBeChecked(); // John - active: true
		expect(switches[1]).not.toBeChecked(); // Jane - active: false
		expect(switches[2]).toBeChecked(); // Bob - active: true
	});

	it("should call onchange when switch is toggled", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const columns: Column[] = [
			{ label: "Name", key: "name" },
			{ label: "Active", key: "active", inline: true, onchange: onChange },
		];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} />,
		);

		const switches = container.querySelectorAll('input[type="checkbox"]');

		// Toggle first switch
		await user.click(switches[0]);
		expect(onChange).toHaveBeenCalled();
	});

	it("should render empty table when data is empty", () => {
		const columns: Column[] = ["name", "age"];

		const { container } = render(<SortableTable columns={columns} data={[]} />);

		const tbody = container.querySelector("tbody");
		expect(tbody?.children).toHaveLength(0);
	});

	it("should apply correct CSS classes to last row", () => {
		const columns: Column[] = ["name"];
		const singleRow: Row[] = [{ id: "1", name: "John" }];

		const { container } = render(
			<SortableTable columns={columns} data={singleRow} />,
		);

		const cells = container.querySelectorAll("td");
		expect(cells[0]).toHaveClass("p-4");
		expect(cells[0]).not.toHaveClass("border-b");
	});

	it("should apply border to non-last rows", () => {
		const columns: Column[] = ["name"];
		const twoRows: Row[] = [
			{ id: "1", name: "John" },
			{ id: "2", name: "Jane" },
		];

		const { container } = render(
			<SortableTable columns={columns} data={twoRows} />,
		);

		const cells = container.querySelectorAll("td");
		// First row should have border
		expect(cells[0]).toHaveClass("border-b");
		// Last row should not have border
		expect(cells[1]).not.toHaveClass("border-b");
	});

	it("should handle mixed column types", () => {
		const columns: Column[] = [
			"name",
			{ label: "Age", key: "age", sortable: true },
			{ label: "Status", key: "active", inline: true },
		];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} />,
		);

		// Should have headers for all columns
		expect(screen.getByText("name")).toBeInTheDocument();
		expect(screen.getByText("Age")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();

		// Should have one sort button (for Age)
		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(1);

		// Should have switches (for Status)
		const switches = container.querySelectorAll('input[type="checkbox"]');
		expect(switches).toHaveLength(3);
	});

	it("should render numeric values correctly", () => {
		const columns: Column[] = ["name", "age"];

		render(<SortableTable columns={columns} data={mockData} />);

		expect(screen.getByText("30")).toBeInTheDocument();
		expect(screen.getByText("25")).toBeInTheDocument();
		expect(screen.getByText("35")).toBeInTheDocument();
	});

	it("should use row id as key for table rows", () => {
		const columns: Column[] = ["name"];

		const { container } = render(
			<SortableTable columns={columns} data={mockData} />,
		);

		const rows = container.querySelectorAll("tbody tr");
		expect(rows).toHaveLength(3);
	});

	it("should render nothing for inline column with non-boolean value", () => {
		const dataWithStringStatus: Row[] = [
			{ id: "1", name: "John", status: "active" },
			{ id: "2", name: "Jane", status: "inactive" },
		];
		const columns: Column[] = [
			{ label: "Name", key: "name" },
			{ label: "Status", key: "status", inline: true },
		];

		const { container } = render(
			<SortableTable columns={columns} data={dataWithStringStatus} />,
		);

		// Should not render any switches since status is a string, not boolean
		const switches = container.querySelectorAll('input[type="checkbox"]');
		expect(switches).toHaveLength(0);

		// The status column cells should exist but be empty (no switch, no text)
		const rows = container.querySelectorAll("tbody tr");
		expect(rows).toHaveLength(2);
	});
});
