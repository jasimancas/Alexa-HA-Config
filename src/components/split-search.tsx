import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import {
	Button,
	Input,
	Menu,
	MenuHandler,
	MenuItem,
	MenuList,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";

export type FilterOption = {
	label: string;
	value: string;
	children?: FilterOption[];
};

export type SplitSearchProps = {
	filters: FilterOption[];
	onFilter: (
		primaryValue: string,
		secondaryValue: string,
		searchTerm: string,
	) => void;
	primaryPlaceholder?: string;
	secondaryPlaceholder?: string;
};

export function SplitSearch({
	filters,
	onFilter,
	primaryPlaceholder = "All",
	secondaryPlaceholder = "All",
}: SplitSearchProps) {
	const [primaryValue, setPrimaryValue] = useState<string>("");
	const [secondaryValue, setSecondaryValue] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");

	// Find the selected primary filter to get its children
	const selectedPrimary = filters.find((f) => f.value === primaryValue);
	const secondaryOptions = selectedPrimary?.children ?? [];

	// Get labels for display
	const primaryLabel =
		filters.find((f) => f.value === primaryValue)?.label || primaryPlaceholder;
	const secondaryLabel =
		secondaryOptions.find((f) => f.value === secondaryValue)?.label ||
		secondaryPlaceholder;

	// Call onFilter whenever any value changes
	useEffect(() => {
		onFilter(primaryValue, secondaryValue, searchTerm);
	}, [primaryValue, secondaryValue, searchTerm, onFilter]);

	const handlePrimaryChange = (value: string) => {
		setPrimaryValue(value);
		// Reset secondary when primary changes
		setSecondaryValue("");
	};

	const handleSecondaryChange = (value: string) => {
		setSecondaryValue(value);
	};

	return (
		<div className="flex w-full flex-col gap-2 md:flex-row md:w-auto">
			{/* Primary Filter Dropdown */}
			<Menu>
				<MenuHandler>
					<Button
						variant="outlined"
						className="flex items-center justify-between gap-2 border-blue-gray-200 text-ha-light-text dark:text-ha-dark-text dark:border-ha-dark-divider min-w-[140px]"
						size="md"
					>
						{primaryLabel}
						<ChevronDownIcon className="h-4 w-4" />
					</Button>
				</MenuHandler>
				<MenuList className="max-h-72 bg-ha-light-card dark:bg-ha-dark-card border-ha-light-divider dark:border-ha-dark-divider">
					<MenuItem
						onClick={() => handlePrimaryChange("")}
						className="text-ha-light-text dark:text-ha-dark-text hover:bg-ha-light-sidebar dark:hover:bg-ha-dark-sidebar"
					>
						{primaryPlaceholder}
					</MenuItem>
					{filters.map((filter) => (
						<MenuItem
							key={filter.value}
							onClick={() => handlePrimaryChange(filter.value)}
							className="text-ha-light-text dark:text-ha-dark-text hover:bg-ha-light-sidebar dark:hover:bg-ha-dark-sidebar"
						>
							{filter.label}
						</MenuItem>
					))}
				</MenuList>
			</Menu>

			{/* Secondary Filter Dropdown - always visible, disabled when no primary selection */}
			<Menu>
				<MenuHandler>
					<Button
						variant="outlined"
						className="flex items-center justify-between gap-2 border-blue-gray-200 text-ha-light-text dark:text-ha-dark-text dark:border-ha-dark-divider min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
						size="md"
						disabled={secondaryOptions.length === 0}
					>
						{secondaryLabel}
						<ChevronDownIcon className="h-4 w-4" />
					</Button>
				</MenuHandler>
				<MenuList className="max-h-72 bg-ha-light-card dark:bg-ha-dark-card border-ha-light-divider dark:border-ha-dark-divider">
					<MenuItem
						onClick={() => handleSecondaryChange("")}
						className="text-ha-light-text dark:text-ha-dark-text hover:bg-ha-light-sidebar dark:hover:bg-ha-dark-sidebar"
					>
						{secondaryPlaceholder}
					</MenuItem>
					{secondaryOptions.map((option) => (
						<MenuItem
							key={option.value}
							onClick={() => handleSecondaryChange(option.value)}
							className="text-ha-light-text dark:text-ha-dark-text hover:bg-ha-light-sidebar dark:hover:bg-ha-dark-sidebar"
						>
							{option.label}
						</MenuItem>
					))}
				</MenuList>
			</Menu>

			{/* Search Input */}
			<div className="w-full md:w-72">
				<Input
					label="Search"
					value={searchTerm}
					icon={<MagnifyingGlassIcon className="h-5 w-5" />}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>
		</div>
	);
}
