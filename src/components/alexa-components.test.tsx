import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlexaCell } from "./alexa-cell";
import { EntityConfigDialog } from "./entity-config-dialog";
import { SecretsBanner } from "./secrets-banner";
import { SettingsDialog } from "./settings-dialog";

describe("AlexaCell", () => {
	it("shows supported entities with their capabilities", () => {
		render(
			<AlexaCell
				entityId="light.a"
				compatibility={{
					supported: true,
					capabilities: ["On/off"],
					warnings: [],
				}}
				config={{ name: "Salón" }}
				edited
				onEdit={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Supported by Alexa")).toBeInTheDocument();
		expect(screen.getByText("“Salón”")).toBeInTheDocument();
		expect(screen.getByTitle("Unpublished")).toBeInTheDocument();
	});

	it("shows unsupported entities and calls onEdit", async () => {
		const onEdit = vi.fn();
		render(
			<AlexaCell
				entityId="sensor.h"
				compatibility={{
					supported: false,
					capabilities: [],
					warnings: ["Nope"],
				}}
				config={{}}
				edited={false}
				onEdit={onEdit}
			/>,
		);
		expect(screen.getByLabelText("Not supported by Alexa")).toBeInTheDocument();
		expect(screen.getByText("Not usable by Alexa")).toBeInTheDocument();
		await userEvent.click(
			screen.getByLabelText("Edit Alexa settings for sensor.h"),
		);
		expect(onEdit).toHaveBeenCalled();
	});

	it("defaults to supported when compatibility is unknown", () => {
		render(
			<AlexaCell entityId="x.y" config={{}} edited={false} onEdit={vi.fn()} />,
		);
		expect(screen.getByLabelText("Supported by Alexa")).toBeInTheDocument();
	});
});

describe("SecretsBanner", () => {
	it("renders nothing without plain-text secrets", () => {
		const { container } = render(
			<SecretsBanner
				secrets={[{ key: "client_id", path: "a", state: "secret" }]}
				isMigrating={false}
				onMigrate={vi.fn()}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("pluralises and shows progress", () => {
		render(
			<SecretsBanner
				secrets={[
					{ key: "client_id", path: "a.client_id", state: "plaintext" },
					{ key: "client_secret", path: "a.client_secret", state: "plaintext" },
				]}
				isMigrating
				onMigrate={vi.fn()}
			/>,
		);
		expect(screen.getByText(/2 credentials are/)).toBeInTheDocument();
		expect(screen.getByText(/Move them/)).toBeInTheDocument();
		expect(screen.getByText("Migrating...")).toBeInTheDocument();
	});
});

describe("EntityConfigDialog", () => {
	it("keeps extra categories and sends the primary first", async () => {
		const onSave = vi.fn();
		render(
			<EntityConfigDialog
				open
				entityId="switch.plug"
				defaultName="Plug"
				config={{ display_categories: "SMARTPLUG,SWITCH,LIGHT" }}
				compatibility={{ supported: false, capabilities: [], warnings: ["w"] }}
				onSave={onSave}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Also: Switch, Light/)).toBeInTheDocument();
		expect(screen.getByText(/Alexa can't use this entity/)).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Device type"), {
			target: { value: "LIGHT" },
		});
		await userEvent.type(screen.getByLabelText("Description"), "Lamp");
		await userEvent.click(screen.getByText("Apply"));
		expect(onSave).toHaveBeenCalledWith({
			name: "",
			description: "Lamp",
			display_categories: "LIGHT,SWITCH",
		});
	});

	it("clears the category with Automatic", async () => {
		const onSave = vi.fn();
		render(
			<EntityConfigDialog
				open
				entityId="light.a"
				defaultName=""
				config={{ name: "A", display_categories: "LIGHT" }}
				onSave={onSave}
				onCancel={vi.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Device type"), {
			target: { value: "" },
		});
		await userEvent.click(screen.getByText("Apply"));
		expect(onSave).toHaveBeenCalledWith({
			name: "A",
			description: "",
			display_categories: "",
		});
	});
});

describe("SettingsDialog", () => {
	const baseProps = {
		open: true,
		isSaving: false,
		isMigrating: false,
		onSave: vi.fn(),
		onMigrate: vi.fn(),
		onCancel: vi.fn(),
	};

	it("clears the locale and keeps a custom endpoint read-only", async () => {
		const onSave = vi.fn();
		render(
			<SettingsDialog
				{...baseProps}
				onSave={onSave}
				settings={{
					locale: "es-ES",
					region: "custom",
					proactiveEvents: true,
					secrets: [
						{ key: "client_id", path: "a.client_id", state: "env" },
						{
							key: "client_secret",
							path: "a.client_secret",
							state: "plaintext",
						},
					],
				}}
			/>,
		);
		expect(screen.getByLabelText("Region")).toBeDisabled();
		expect(
			screen.getByText(/custom endpoint is configured/),
		).toBeInTheDocument();
		expect(screen.getByText("From environment variable")).toBeInTheDocument();
		expect(screen.getByText(/Credentials in plain text/)).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Language (locale)"), {
			target: { value: "" },
		});
		await userEvent.click(screen.getByText("Save"));
		expect(onSave).toHaveBeenCalledWith({ locale: null });
	});

	it("migrates from the dialog and shows saving state", async () => {
		const onMigrate = vi.fn();
		render(
			<SettingsDialog
				{...baseProps}
				isSaving
				onMigrate={onMigrate}
				settings={{
					locale: "",
					region: "",
					proactiveEvents: false,
					secrets: [
						{ key: "client_id", path: "a.client_id", state: "plaintext" },
					],
				}}
			/>,
		);
		expect(screen.getByText("Saving...")).toBeInTheDocument();
		await userEvent.click(screen.getByText("Migrate to secrets.yaml"));
		expect(onMigrate).toHaveBeenCalled();
	});

	it("disables proactive events by choosing Disabled", async () => {
		const onSave = vi.fn();
		render(
			<SettingsDialog
				{...baseProps}
				onSave={onSave}
				settings={{
					locale: "",
					region: "eu",
					proactiveEvents: false,
					secrets: [],
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Region"), {
			target: { value: "" },
		});
		await userEvent.type(screen.getByLabelText("Client ID"), "id");
		await userEvent.click(screen.getByText("Save"));
		expect(onSave).toHaveBeenCalledWith({ region: null, clientId: "id" });
	});
});
