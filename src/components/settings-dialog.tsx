import {
	Button,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { ALEXA_LOCALES, ALEXA_REGIONS } from "@/configs/alexa";
import type {
	AlexaSettings,
	AlexaSettingsUpdate,
	SecretFinding,
} from "@/types/alexa.types";

export type SettingsDialogProps = {
	open: boolean;
	settings?: AlexaSettings;
	isSaving: boolean;
	isMigrating: boolean;
	onSave: (update: AlexaSettingsUpdate) => void;
	onMigrate: () => void;
	onCancel: () => void;
};

const inputClass =
	"w-full rounded-md border border-ha-light-divider dark:border-ha-dark-divider bg-transparent px-3 py-2 text-sm text-ha-light-text dark:text-ha-dark-text focus:border-ha-primary focus:outline-none";
const labelClass =
	"mb-1 block text-sm font-medium text-ha-light-text dark:text-ha-dark-text";
const hintClass =
	"mt-1 text-xs text-ha-light-text-secondary dark:text-ha-dark-text-secondary";

const STATE_LABEL: Record<SecretFinding["state"], string> = {
	secret: "Stored in secrets.yaml",
	env: "From environment variable",
	plaintext: "Plain text in your configuration",
	missing: "Not set",
};

const STATE_COLOR: Record<SecretFinding["state"], string> = {
	secret: "text-ha-success",
	env: "text-ha-success",
	plaintext: "text-ha-error",
	missing: "text-ha-light-text-secondary dark:text-ha-dark-text-secondary",
};

/**
 * Global Alexa settings. Credentials are write-only: the current value is
 * never sent to the browser, only whether it is set and how it is stored.
 */
export function SettingsDialog({
	open,
	settings,
	isSaving,
	isMigrating,
	onSave,
	onMigrate,
	onCancel,
}: SettingsDialogProps) {
	const [locale, setLocale] = useState("");
	const [region, setRegion] = useState("");
	const [clientId, setClientId] = useState("");
	const [clientSecret, setClientSecret] = useState("");

	useEffect(() => {
		if (!open) return;
		setLocale(settings?.locale ?? "");
		setRegion(settings?.region === "custom" ? "" : (settings?.region ?? ""));
		setClientId("");
		setClientSecret("");
	}, [open, settings]);

	const secrets = settings?.secrets ?? [];
	const plaintext = secrets.filter((s) => s.state === "plaintext");
	const status = (key: string) => secrets.find((s) => s.key === key);

	const save = () => {
		const update: AlexaSettingsUpdate = {};
		if (locale !== (settings?.locale ?? "")) update.locale = locale || null;
		if (settings?.region !== "custom" && region !== (settings?.region ?? "")) {
			update.region = (region || null) as AlexaSettingsUpdate["region"];
		}
		if (clientId.trim()) update.clientId = clientId;
		if (clientSecret.trim()) update.clientSecret = clientSecret;
		onSave(update);
	};

	const secretField = (
		key: "client_id" | "client_secret",
		label: string,
		value: string,
		setValue: (v: string) => void,
	) => {
		const current = status(key);
		return (
			<div>
				<label htmlFor={`alexa-${key}`} className={labelClass}>
					{label}
				</label>
				<input
					id={`alexa-${key}`}
					type="password"
					autoComplete="off"
					className={inputClass}
					value={value}
					placeholder={
						current && current.state !== "missing"
							? "•••••••• (leave empty to keep)"
							: "Not set"
					}
					onChange={(e) => setValue(e.target.value)}
				/>
				{current && (
					<p className={`mt-1 text-xs ${STATE_COLOR[current.state]}`}>
						{STATE_LABEL[current.state]}
					</p>
				)}
			</div>
		);
	};

	return (
		<Dialog
			open={open}
			handler={onCancel}
			size="md"
			className="bg-ha-light-card dark:bg-ha-dark-card"
		>
			<DialogHeader className="text-ha-light-text dark:text-ha-dark-text">
				Alexa settings
			</DialogHeader>
			<DialogBody className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto">
				<div>
					<label htmlFor="alexa-locale" className={labelClass}>
						Language (locale)
					</label>
					<select
						id="alexa-locale"
						className={inputClass}
						value={locale}
						onChange={(e) => setLocale(e.target.value)}
					>
						<option value="">Default (en-US)</option>
						{ALEXA_LOCALES.map((l) => (
							<option key={l} value={l}>
								{l}
							</option>
						))}
					</select>
					<p className={hintClass}>
						Must match the language of your Echo devices.
					</p>
				</div>

				<div className="border-t border-ha-light-divider pt-4 dark:border-ha-dark-divider">
					<Typography className="font-medium text-ha-light-text dark:text-ha-dark-text">
						Proactive events
					</Typography>
					<p className={hintClass}>
						Lets Home Assistant tell Alexa when something changes, so door,
						motion and temperature sensors or doorbells can trigger Alexa
						routines. Credentials come from "Alexa Skill Messaging" in your
						skill and are always saved to <code>secrets.yaml</code>.
					</p>
					<div className="mt-3 flex flex-col gap-4">
						<div>
							<label htmlFor="alexa-region" className={labelClass}>
								Region
							</label>
							<select
								id="alexa-region"
								className={inputClass}
								value={region}
								disabled={settings?.region === "custom"}
								onChange={(e) => setRegion(e.target.value)}
							>
								{ALEXA_REGIONS.map((r) => (
									<option key={r.value} value={r.value}>
										{r.label}
									</option>
								))}
							</select>
							{settings?.region === "custom" && (
								<p className={hintClass}>
									A custom endpoint is configured in YAML; edit it there.
								</p>
							)}
						</div>
						{secretField("client_id", "Client ID", clientId, setClientId)}
						{secretField(
							"client_secret",
							"Client secret",
							clientSecret,
							setClientSecret,
						)}
					</div>
				</div>

				{plaintext.length > 0 && (
					<div className="rounded-md bg-ha-error/10 p-3 text-sm text-ha-light-text dark:text-ha-dark-text">
						<strong>Credentials in plain text: </strong>
						{plaintext.map((s) => s.path).join(", ")}. Move them to{" "}
						<code>secrets.yaml</code> so they don't leak in backups or
						screenshots of your configuration.
						<div className="mt-2">
							<Button
								size="sm"
								color="red"
								onClick={onMigrate}
								disabled={isMigrating}
							>
								{isMigrating ? "Migrating..." : "Migrate to secrets.yaml"}
							</Button>
						</div>
					</div>
				)}
			</DialogBody>
			<DialogFooter className="gap-2">
				<Button
					variant="text"
					onClick={onCancel}
					className="text-ha-light-text dark:text-ha-dark-text"
				>
					Cancel
				</Button>
				<Button className="bg-ha-primary" onClick={save} disabled={isSaving}>
					{isSaving ? "Saving..." : "Save"}
				</Button>
			</DialogFooter>
		</Dialog>
	);
}
