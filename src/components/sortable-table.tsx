import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import {
	Avatar,
	IconButton,
	Switch,
	Typography,
} from "@material-tailwind/react";
import classNames from "classnames";
import { upperFirst } from "lodash";
import type { ChangeEvent, ReactNode } from "react";

export type Action = {
	type: "edit";
	onClick: (row: Row) => void;
};

export type Image = {
	alt: string;
	src: string;
};

export type Basic = string | number | boolean;

export type CompositeColumn = {
	label: string;
	key: string;
	sortable?: boolean;
	inline?: boolean;
	collapseSmall?: string;
	onchange?: (event: ChangeEvent<HTMLInputElement>) => void;
	/** Custom cell content; takes precedence over the raw value */
	render?: (row: Row) => ReactNode;
};

export type Column = string | CompositeColumn;

export type Row = {
	id: string;
	[key: string]: Basic | Image;
};

export type Props = {
	columns: Column[];
	data: Row[];
	onSort?: (key: string) => void;
	actions?: Action[];
};

function isImage(value: unknown): value is Image {
	return (
		!!value &&
		typeof value === "object" &&
		Object.hasOwn(value, "src") &&
		Object.hasOwn(value, "alt")
	);
}

function isColumnSortable(column: CompositeColumn) {
	return !!column.sortable;
}

function isInlineAction(column: CompositeColumn) {
	return !!column.inline;
}

function normalizeHeader(headers: Column[]): CompositeColumn[] {
	return headers.map((header: Column) => {
		if (typeof header === "string") {
			return {
				label: header,
				key: header,
			};
		}

		return header;
	});
}

function getInlineAction(item: Row, column: CompositeColumn) {
	const value = item[column.key];

	if (typeof value === "boolean") {
		return (
			<Switch
				color="blue"
				value={item.id}
				checked={value}
				aria-label={`Share ${item.entity_id ?? item.id} with Alexa`}
				onChange={column?.onchange}
			/>
		);
	}

	return;
}

function getColumnValue(
	item: Row,
	column: CompositeColumn,
	includeLable = false,
) {
	if (column.render) {
		return (
			<div key={`render-${column.key}-${item.id}`}>
				{includeLable && (
					<Typography variant="small" className="font-bold">
						{column.label}:
					</Typography>
				)}
				{column.render(item)}
			</div>
		);
	}

	const value = item[column.key];
	if (isImage(value)) {
		return <Avatar src={value.src} alt={value.alt} size="sm" />;
	}

	if (isInlineAction(column)) {
		return getInlineAction(item, column);
	}

	return value !== undefined && value.toString().trim().length > 0 ? (
		<Typography
			key={`typo-${column.key}-${item.id}`}
			variant="small"
			className="font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
		>
			{includeLable && <strong>{column.label}: </strong>}
			{value}
		</Typography>
	) : null;
}

export function SortableTable({ columns, data, onSort }: Props) {
	const columsGroups = new Map<string, CompositeColumn[]>();
	const headers = normalizeHeader(columns);

	headers.forEach((header) => {
		if (header.collapseSmall) {
			if (!columsGroups.has(header.collapseSmall)) {
				columsGroups.set(header.collapseSmall, []);
			}
			columsGroups.get(header.collapseSmall)?.push(header);
		}
	});

	return (
		<table className="mt-4 w-full min-w-max table-auto text-left text-ha-light-text dark:text-ha-dark-text">
			<thead>
				<tr>
					{Array.from(columsGroups.keys()).map((key) => (
						<th
							key={key}
							className={classNames(
								"border-y border-ha-light-divider dark:border-ha-dark-divider bg-ha-light-sidebar/50 dark:bg-ha-dark-sidebar/50 p-4 transition-colors",
								{ "lg:hidden": true },
							)}
						>
							<Typography
								variant="small"
								className="flex items-center justify-between gap-2 font-normal leading-none text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
							>
								{upperFirst(key)}
							</Typography>
						</th>
					))}
					{headers.map((head) => (
						<th
							key={head.key}
							className={classNames(
								"border-y border-ha-light-divider dark:border-ha-dark-divider bg-ha-light-sidebar/50 dark:bg-ha-dark-sidebar/50 p-4 transition-colors",
								{ "hidden lg:table-cell": !!head.collapseSmall },
							)}
						>
							<Typography
								variant="small"
								className="flex items-center justify-between gap-2 font-normal leading-none text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
							>
								{head.label}{" "}
								{isColumnSortable(head) && (
									<IconButton
										variant="text"
										onClick={() => onSort?.(head.key)}
										className="text-ha-primary"
									>
										<ChevronUpDownIcon strokeWidth={2} className="h-4 w-4" />
									</IconButton>
								)}
							</Typography>
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{data?.map((item, index) => {
					const isLast = index === data.length - 1;

					return (
						<tr key={item.id}>
							{Array.from(columsGroups.keys()).map((key) => (
								<td
									key={`${key}-${item.id}`}
									className={classNames("p-4", {
										"border-b border-ha-light-divider dark:border-ha-dark-divider":
											!isLast,
										"lg:hidden": true,
									})}
								>
									{columsGroups
										.get(key)
										?.map((column) => getColumnValue(item, column, true))}
								</td>
							))}
							{headers.map((column) => {
								return (
									<td
										className={classNames("p-4", {
											"border-b border-ha-light-divider dark:border-ha-dark-divider":
												!isLast,
											"hidden lg:table-cell": !!column.collapseSmall,
										})}
										key={`${item.id}-${column.key}`}
									>
										{getColumnValue(item, column)}
									</td>
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
