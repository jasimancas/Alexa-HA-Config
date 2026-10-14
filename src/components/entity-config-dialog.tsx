import {
	Button,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { ALEXA_DISPLAY_CATEGORIES } from "@/configs/alexa";
import type {
	AlexaCompatibility,
	AlexaEntityConfig,
} from "@/types/alexa.types";

export type EntityConfigDialogProps = {
	open: boolean;
	entityId: string;
	/** Name Home Assistant shows, used as placeholder */
	defaultName: string;
	config: AlexaEntityConfig;
	compatibility?: AlexaCompatibility;
	onSave: (config: AlexaEntityConfig) => void;
	onCancel: () => void;
};

const inputClass =
	"w-full rounded-md border border-ha-light-divider dark:border-ha-dark-divider bg-transparent px-3 py-2 text-sm text-ha-light-text dark:text-ha-dark-text focus:border-ha-primary focus:outline-none";
const labelClass =
	"mb-1 block text-sm font-medium text-ha-light-text dark:text-ha-dark-text";
const hintClass =
	"mt-1 text-xs text-ha-light-text-secondary dark:text-ha-dark-text-secondary";

const humanize = (category: string) =>
	category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * Edits alexa.smart_home.entity_config for one entity. Changes are kept
 * locally and written on Publish.
 */
export function EntityConfigDialog({
	open,
	entityId,
	defaultName,
	config,
	compatibility,
	onSave,
	onCancel,
}: EntityConfigDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [primary, setPrimary] = useState("");
	const [extra, setExtra] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;
		const [first = "", ...rest] = (config.display_categories ?? "")
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean);
		setName(config.name ?? "");
		setDescription(config.description ?? "");
		setPrimary(first);
		setExtra(rest);
	}, [open, config]);

	const save = () =>
		onSave({
			name,
			description,
			display_categories: primary ? [primary, ...extra].join(",") : "",
		});

	return (
		<Dialog
			open={open}
			handler={onCancel}
			size="md"
			className="bg-ha-light-card dark:bg-ha-dark-card"
		>
			<DialogHeader className="flex flex-col items-start gap-1 text-ha-light-text dark:text-ha-dark-text">
				Alexa settings
				<Typography
					variant="small"
					className="font-mono font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
				>
					{entityId}
				</Typography>
			</DialogHeader>
			<DialogBody className="flex flex-col gap-4">
				{compatibility && (
					<div
						className={`rounded-md p-3 text-sm ${compatibility.supported ? "bg-ha-success/10" : "bg-ha-error/10"} text-ha-light-text dark:text-ha-dark-text`}
					>
						<strong>
							{compatibility.supported
								? "Alexa can: "
								: "Alexa can't use this entity. "}
						</strong>
						{compatibility.capabilities.join(", ")}
						{compatibility.warnings.map((w) => (
							<div key={w} className="mt-1 text-ha-warning">
								{w}
							</div>
						))}
					</div>
				)}

				<div>
					<label htmlFor="alexa-name" className={labelClass}>
						Spoken name
					</label>
					<input
						id="alexa-name"
						className={inputClass}
						value={name}
						maxLength={128}
						placeholder={defaultName || "Name in Home Assistant"}
						onChange={(e) => setName(e.target.value)}
					/>
					<p className={hintClass}>
						What you say to Alexa ("Alexa, turn on{" "}
						<em>{name || defaultName || "…"}</em>"). Leave empty to use the Home
						Assistant name.
					</p>
				</div>

				<div>
					<label htmlFor="alexa-description" className={labelClass}>
						Description
					</label>
					<input
						id="alexa-description"
						className={inputClass}
						value={description}
						maxLength={128}
						placeholder="Shown in the Alexa app"
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>

				<div>
					<label htmlFor="alexa-category" className={labelClass}>
						Device type
					</label>
					<select
						id="alexa-category"
						className={inputClass}
						value={primary}
						onChange={(e) => {
							setPrimary(e.target.value);
							setExtra((prev) => prev.filter((c) => c !== e.target.value));
						}}
					>
						<option value="">Automatic (recommended)</option>
						{ALEXA_DISPLAY_CATEGORIES.map((c) => (
							<option key={c} value={c}>
								{humanize(c)}
							</option>
						))}
					</select>
					<p className={hintClass}>
						Changes the icon and how Alexa groups it, e.g. a smart plug driving
						a lamp as "Light" so it obeys "turn off the lights". Overriding
						cameras, garage doors or alarm panels can limit features.
					</p>
					{extra.length > 0 && (
						<p className={hintClass}>
							Also: {extra.map(humanize).join(", ")} (kept from your config)
						</p>
					)}
				</div>
			</DialogBody>
			<DialogFooter className="gap-2">
				<Button
					variant="text"
					onClick={onCancel}
					className="text-ha-light-text dark:text-ha-dark-text"
				>
					Cancel
				</Button>
				<Button className="bg-ha-primary" onClick={save}>
					Apply
				</Button>
			</DialogFooter>
		</Dialog>
	);
}
