import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
	Button,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	Typography,
} from "@material-tailwind/react";

export type ConfirmDialogProps = {
	open: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "danger" | "warning" | "success";
	onConfirm: () => void;
	onCancel: () => void;
	isLoading?: boolean;
};

const variantConfig = {
	default: {
		color: "blue",
		iconColor: "text-ha-info",
	},
	danger: {
		color: "red",
		iconColor: "text-ha-error",
	},
	warning: {
		color: "orange",
		iconColor: "text-ha-warning",
	},
	success: {
		color: "green",
		iconColor: "text-ha-success",
	},
} as const;

export function ConfirmDialog({
	open,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "default",
	onConfirm,
	onCancel,
	isLoading = false,
}: ConfirmDialogProps) {
	const config = variantConfig[variant];

	return (
		<Dialog
			open={open}
			handler={onCancel}
			size="sm"
			className="bg-ha-light-card dark:bg-ha-dark-card"
		>
			<DialogHeader className="flex items-center gap-3 text-ha-light-text dark:text-ha-dark-text">
				<ExclamationTriangleIcon className={`h-6 w-6 ${config.iconColor}`} />
				<Typography
					variant="h5"
					className="text-ha-light-text dark:text-ha-dark-text"
				>
					{title}
				</Typography>
			</DialogHeader>
			<DialogBody>
				<Typography
					variant="paragraph"
					className="font-normal text-ha-light-text-secondary dark:text-ha-dark-text-secondary"
				>
					{message}
				</Typography>
			</DialogBody>
			<DialogFooter className="gap-2">
				<Button
					variant="outlined"
					onClick={onCancel}
					disabled={isLoading}
					className="border-ha-light-divider dark:border-ha-dark-divider text-ha-light-text dark:text-ha-dark-text"
				>
					{cancelText}
				</Button>
				<Button color={config.color} onClick={onConfirm} disabled={isLoading}>
					{confirmText}
				</Button>
			</DialogFooter>
		</Dialog>
	);
}
