import type { ChangeEvent, ReactNode } from "react";
import type { Row } from "@/components/sortable-table";

export const tableQuickFilters = [
	{
		label: "All",
		value: "all",
	},
	{
		label: "Synced",
		value: "synced",
	},
	{
		label: "Unsynced",
		value: "unsynced",
	},
];

export const createTableHeaders = (
	onChange: (event: ChangeEvent<HTMLInputElement>) => void,
	renderAlexa?: (row: Row) => ReactNode,
) => [
	{
		label: "Name",
		key: "name",
		sortable: true,
		collapseSmall: "info",
	},
	{
		label: "Device",
		key: "device_name",
		sortable: true,
		collapseSmall: "info",
	},
	{
		label: "Entity Id",
		key: "entity_id",
		sortable: true,
		collapseSmall: "info",
	},
	{
		label: "Manufacturer",
		key: "manufacturer",
		sortable: true,
		collapseSmall: "info",
	},
	{ label: "Area", key: "area", sortable: true, collapseSmall: "info" },
	...(renderAlexa
		? [{ label: "Alexa", key: "alexa", sortable: false, render: renderAlexa }]
		: []),
	{
		label: "Shared",
		key: "shared",
		sortable: false,
		inline: true,
		onchange: onChange,
	},
];
