import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Button, Typography } from "@material-tailwind/react";
import type { SecretFinding } from "@/types/alexa.types";

export type SecretsBannerProps = {
	secrets: SecretFinding[];
	isMigrating: boolean;
	onMigrate: () => void;
};

/** Warns about credentials stored in plain text under `alexa:` */
export function SecretsBanner({
	secrets,
	isMigrating,
	onMigrate,
}: SecretsBannerProps) {
	const plaintext = secrets.filter((s) => s.state === "plaintext");
	if (plaintext.length === 0) return null;

	return (
		<div
			role="alert"
			className="mb-6 flex flex-col gap-3 rounded-md border border-ha-error/40 bg-ha-error/10 p-4 text-left sm:flex-row sm:items-center"
		>
			<ShieldExclamationIcon className="h-6 w-6 shrink-0 text-ha-error" />
			<div className="flex-1">
				<Typography className="font-medium text-ha-light-text dark:text-ha-dark-text">
					{plaintext.length === 1
						? "1 credential is"
						: `${plaintext.length} credentials are`}{" "}
					stored in plain text
				</Typography>
				<Typography
					variant="small"
					className="text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
				>
					{plaintext.map((s) => s.path).join(", ")}. Move{" "}
					{plaintext.length === 1 ? "it" : "them"} to secrets.yaml and reference{" "}
					{plaintext.length === 1 ? "it" : "them"} with !secret.
				</Typography>
			</div>
			<Button
				size="sm"
				color="red"
				className="shrink-0"
				onClick={onMigrate}
				disabled={isMigrating}
			>
				{isMigrating ? "Migrating..." : "Migrate to secrets.yaml"}
			</Button>
		</div>
	);
}
