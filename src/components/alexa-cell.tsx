import {
	CheckCircleIcon,
	ExclamationTriangleIcon,
	NoSymbolIcon,
	PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { IconButton, Typography } from "@material-tailwind/react";
import type {
	AlexaCompatibility,
	AlexaEntityConfig,
} from "@/types/alexa.types";

export type AlexaCellProps = {
	entityId: string;
	compatibility?: AlexaCompatibility;
	config: AlexaEntityConfig;
	edited: boolean;
	onEdit: () => void;
};

/**
 * Compatibility badge, what Alexa can do, the custom Alexa name and an edit
 * button for one entity row.
 */
export function AlexaCell({
	entityId,
	compatibility,
	config,
	edited,
	onEdit,
}: AlexaCellProps) {
	const supported = compatibility?.supported ?? true;
	const warnings = compatibility?.warnings ?? [];
	const Icon = !supported
		? NoSymbolIcon
		: warnings.length > 0
			? ExclamationTriangleIcon
			: CheckCircleIcon;
	const iconColor = !supported
		? "text-ha-error"
		: warnings.length > 0
			? "text-ha-warning"
			: "text-ha-success";
	const summary = supported
		? (compatibility?.capabilities ?? []).join(", ")
		: "Not usable by Alexa";
	const details = [summary, ...warnings].filter(Boolean).join("\n");

	return (
		<div className="flex items-start gap-2 max-w-xs">
			<Icon
				className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`}
				aria-label={supported ? "Supported by Alexa" : "Not supported by Alexa"}
			/>
			<div className="min-w-0 flex-1" title={details}>
				{config.name && (
					<Typography
						variant="small"
						className="font-medium text-ha-light-text dark:text-ha-dark-text truncate"
					>
						“{config.name}”
						{edited && (
							<span className="ml-1 text-ha-primary" title="Unpublished">
								•
							</span>
						)}
					</Typography>
				)}
				<Typography
					variant="small"
					className="text-xs text-ha-light-text-secondary dark:text-ha-dark-text-secondary truncate"
				>
					{summary}
				</Typography>
				{warnings.map((warning) => (
					<Typography
						key={warning}
						variant="small"
						className="text-xs text-ha-warning"
					>
						{warning}
					</Typography>
				))}
			</div>
			<IconButton
				variant="text"
				size="sm"
				className="shrink-0 text-ha-primary"
				onClick={onEdit}
				aria-label={`Edit Alexa settings for ${entityId}`}
			>
				<PencilSquareIcon className="h-4 w-4" />
			</IconButton>
		</div>
	);
}
