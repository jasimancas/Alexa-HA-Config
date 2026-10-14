import type { AlexaCompatibility } from "@/types/alexa.types";

export type EntityState = {
	state?: string;
	attributes?: Record<string, unknown>;
};

export const PROACTIVE_WARNING =
	"Needs proactive events (Settings) to report changes";

/** Feature flags from Home Assistant (homeassistant/components/<domain>/const.py) */
const COVER_STOP = 8;
const COVER_SET_POSITION = 4;
const COVER_SET_TILT_POSITION = 128;
const FAN_SET_SPEED = 1;
const FAN_OSCILLATE = 2;
const FAN_DIRECTION = 4;
const FAN_PRESET_MODE = 8;
const VALVE_SET_POSITION = 4;
const VACUUM_PAUSE = 4;

const CONTACT_CLASSES = ["door", "garage_door", "opening", "window"];
const MOTION_CLASSES = ["motion", "presence", "occupancy"];

const has = (features: number, flag: number) => (features & flag) === flag;

/**
 * Describes what Alexa can do with an entity, following the Home Assistant
 * Alexa Smart Home integration docs. `proactiveEvents` hides the reminder
 * for sensors once proactive events are configured.
 */
export function alexaCompatibility(
	entityId: string,
	entity: EntityState | undefined,
	proactiveEvents = false,
): AlexaCompatibility {
	const domain = entityId.split(".")[0];
	const attrs = entity?.attributes ?? {};
	const features = Number(attrs.supported_features ?? 0);
	const deviceClass = String(attrs.device_class ?? "");
	const caps: string[] = [];
	const warnings: string[] = [];
	const ok = (...c: string[]) => {
		caps.push(...c);
		return { supported: true, capabilities: caps, warnings };
	};
	const no = (reason: string) => ({
		supported: false,
		capabilities: [],
		warnings: [reason],
	});
	const needsProactive = () => {
		if (!proactiveEvents) warnings.push(PROACTIVE_WARNING);
	};

	switch (domain) {
		case "light": {
			const modes = (attrs.supported_color_modes as string[] | undefined) ?? [];
			caps.push("On/off");
			if (modes.some((m) => m !== "onoff")) caps.push("Brightness");
			if (modes.includes("color_temp")) caps.push("Color temperature");
			if (modes.some((m) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m))) {
				caps.push("Color");
			}
			return ok();
		}
		case "switch":
		case "input_boolean":
		case "automation":
		case "group":
		case "alert":
			return ok("On/off");
		case "scene":
			warnings.push("Can be activated but not turned off");
			return ok("Activate");
		case "script":
			return ok("Run", "Stop");
		case "button":
		case "input_button":
			return ok("Press");
		case "climate": {
			caps.push("Target temperature");
			if (Array.isArray(attrs.hvac_modes) && attrs.hvac_modes.length > 0) {
				caps.push("Mode");
			}
			return ok();
		}
		case "cover": {
			caps.push("Open/close");
			if (has(features, COVER_SET_POSITION)) caps.push("Position");
			if (has(features, COVER_SET_TILT_POSITION)) caps.push("Tilt");
			if (has(features, COVER_STOP)) caps.push("Stop");
			if (deviceClass === "garage") {
				warnings.push("Opening asks for a 4-digit voice PIN");
			}
			return ok();
		}
		case "fan": {
			caps.push("On/off");
			if (has(features, FAN_SET_SPEED) || "percentage" in attrs) {
				caps.push("Speed");
			}
			if (has(features, FAN_PRESET_MODE)) caps.push("Preset mode");
			if (has(features, FAN_OSCILLATE)) caps.push("Oscillation");
			if (has(features, FAN_DIRECTION)) caps.push("Direction");
			return ok();
		}
		case "lock":
			warnings.push("Unlocking asks for a 4-digit voice PIN");
			return ok("Lock/unlock");
		case "alarm_control_panel":
			if (attrs.code_arm_required === true) {
				return no(
					"Not discovered while the panel requires a code to arm (code_arm_required)",
				);
			}
			warnings.push("Disarming asks for a 4-digit voice PIN");
			return ok("Arm/disarm");
		case "media_player":
			return ok("Power", "Volume", "Playback", "Input source");
		case "humidifier":
			return ok("On/off", "Target humidity", "Mode");
		case "water_heater":
			return ok("Target temperature", "Mode");
		case "vacuum":
			caps.push("Start/stop");
			if (has(features, VACUUM_PAUSE)) caps.push("Pause/resume");
			return ok();
		case "valve":
			caps.push("Open/close");
			if (has(features, VALVE_SET_POSITION)) caps.push("Position");
			return ok();
		case "input_number":
		case "number":
			return ok("Set value");
		case "timer":
			warnings.push(
				'Avoid the word "timer" in its name; Alexa confuses it with its own timers',
			);
			return ok("Start/pause/cancel");
		case "remote":
			return ok("Activity");
		case "camera":
			warnings.push(
				"Needs the stream integration and Home Assistant on HTTPS port 443",
			);
			return ok("Video stream");
		case "sensor": {
			const unit = String(attrs.unit_of_measurement ?? "");
			if (deviceClass === "temperature" || unit === "°C" || unit === "°F") {
				needsProactive();
				return ok("Temperature");
			}
			return no("Alexa only supports temperature sensors");
		}
		case "binary_sensor":
			if (CONTACT_CLASSES.includes(deviceClass)) {
				needsProactive();
				return ok("Contact (open/closed)", "Routines");
			}
			if (MOTION_CLASSES.includes(deviceClass)) {
				needsProactive();
				return ok("Motion", "Routines");
			}
			return no(
				`Alexa only supports door, window, opening, garage door, motion or presence sensors${deviceClass ? ` (this one is "${deviceClass}")` : ""}`,
			);
		case "event":
			if (deviceClass === "doorbell") {
				needsProactive();
				return ok("Doorbell announcement");
			}
			return no("Only doorbell events are supported");
		case "image_processing":
			needsProactive();
			return ok("Presence");
		default:
			return no(`The ${domain} domain is not supported by Alexa`);
	}
}
