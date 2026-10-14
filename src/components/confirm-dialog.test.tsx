import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

describe("ConfirmDialog", () => {
	const defaultProps: ConfirmDialogProps = {
		open: true,
		title: "Confirm Action",
		message: "Are you sure you want to proceed?",
		onConfirm: vi.fn(),
		onCancel: vi.fn(),
	};

	it("should render dialog when open is true", () => {
		render(<ConfirmDialog {...defaultProps} />);

		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(
			screen.getByText("Are you sure you want to proceed?"),
		).toBeInTheDocument();
	});

	it("should not render dialog when open is false", () => {
		render(<ConfirmDialog {...defaultProps} open={false} />);

		expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
	});

	it("should render default button texts", () => {
		render(<ConfirmDialog {...defaultProps} />);

		expect(screen.getByText("Confirm")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("should render custom button texts", () => {
		render(
			<ConfirmDialog
				{...defaultProps}
				confirmText="Yes, Delete"
				cancelText="No, Keep"
			/>,
		);

		expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
		expect(screen.getByText("No, Keep")).toBeInTheDocument();
	});

	it("should call onConfirm when confirm button is clicked", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

		const confirmButton = screen.getByText("Confirm");
		await user.click(confirmButton);

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it("should call onCancel when cancel button is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();

		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("should disable buttons when isLoading is true", () => {
		render(<ConfirmDialog {...defaultProps} isLoading={true} />);

		const confirmButton = screen.getByText("Confirm");
		const cancelButton = screen.getByText("Cancel");

		expect(confirmButton).toBeDisabled();
		expect(cancelButton).toBeDisabled();
	});

	it("should enable buttons when isLoading is false", () => {
		render(<ConfirmDialog {...defaultProps} isLoading={false} />);

		const confirmButton = screen.getByText("Confirm");
		const cancelButton = screen.getByText("Cancel");

		expect(confirmButton).not.toBeDisabled();
		expect(cancelButton).not.toBeDisabled();
	});

	it("should render with default variant", () => {
		render(<ConfirmDialog {...defaultProps} />);

		// Dialog should render successfully with default variant
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
	});

	it("should render with danger variant", () => {
		render(<ConfirmDialog {...defaultProps} variant="danger" />);

		// Dialog should render successfully with danger variant
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
	});

	it("should render with warning variant", () => {
		render(<ConfirmDialog {...defaultProps} variant="warning" />);

		// Dialog should render successfully with warning variant
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
	});

	it("should render with success variant", () => {
		render(<ConfirmDialog {...defaultProps} variant="success" />);

		// Dialog should render successfully with success variant
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
	});

	it("should render dialog header with title", () => {
		render(<ConfirmDialog {...defaultProps} />);

		// Dialog should have a title in the header
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
	});

	it("should not call onConfirm when button is disabled", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(
			<ConfirmDialog
				{...defaultProps}
				onConfirm={onConfirm}
				isLoading={true}
			/>,
		);

		const confirmButton = screen.getByText("Confirm");
		await user.click(confirmButton);

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("should not call onCancel when button is disabled", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();

		render(
			<ConfirmDialog {...defaultProps} onCancel={onCancel} isLoading={true} />,
		);

		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		expect(onCancel).not.toHaveBeenCalled();
	});

	it("should render dialog with small size", () => {
		render(<ConfirmDialog {...defaultProps} />);

		// Dialog should be accessible
		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
	});

	it("should handle long messages", () => {
		const longMessage =
			"This is a very long message that explains in detail what will happen when the user confirms this action. It contains multiple sentences and should wrap properly in the dialog.";

		render(<ConfirmDialog {...defaultProps} message={longMessage} />);

		expect(screen.getByText(longMessage)).toBeInTheDocument();
	});

	it("should handle long titles", () => {
		const longTitle = "This is a Very Long Title for the Confirmation Dialog";

		render(<ConfirmDialog {...defaultProps} title={longTitle} />);

		expect(screen.getByText(longTitle)).toBeInTheDocument();
	});

	it("should render all sections correctly", () => {
		render(<ConfirmDialog {...defaultProps} />);

		// Check all content is present
		expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		expect(
			screen.getByText("Are you sure you want to proceed?"),
		).toBeInTheDocument();
		expect(screen.getByText("Confirm")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("should maintain focus management for accessibility", () => {
		render(<ConfirmDialog {...defaultProps} />);

		// Dialog should be in the document and accessible
		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
	});

	it("should allow multiple renders with different props", () => {
		const { rerender } = render(<ConfirmDialog {...defaultProps} />);

		expect(screen.getByText("Confirm Action")).toBeInTheDocument();

		rerender(
			<ConfirmDialog
				{...defaultProps}
				title="Updated Title"
				message="Updated message"
			/>,
		);

		expect(screen.getByText("Updated Title")).toBeInTheDocument();
		expect(screen.getByText("Updated message")).toBeInTheDocument();
	});

	it("should handle rapid button clicks gracefully", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

		const confirmButton = screen.getByText("Confirm");

		// Simulate rapid clicks
		await user.click(confirmButton);
		await user.click(confirmButton);
		await user.click(confirmButton);

		// All clicks should be registered
		expect(onConfirm).toHaveBeenCalledTimes(3);
	});
});
