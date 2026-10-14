import { describe, expect, it } from "vitest";
import { alexaCompatibility } from "./alexa-compat.util";

const state = (attributes: Record<string, unknown>) => ({
	state: "on",
	attributes,
});

describe("alexaCompatibility", () => {
	it("describes light capabilities from color modes", () => {
		expect(
			alexaCompatibility("light.a", state({ supported_color_modes: ["onoff"] }))
				.capabilities,
		).toEqual(["On/off"]);
		expect(
			alexaCompatibility(
				"light.a",
				state({ supported_color_modes: ["color_temp", "xy"] }),
			).capabilities,
		).toEqual(["On/off", "Brightness", "Color temperature", "Color"]);
	});

	it("uses cover feature flags", () => {
		const c = alexaCompatibility(
			"cover.blind",
			state({ supported_features: 4 | 8 | 128 }),
		);
		expect(c.capabilities).toEqual(["Open/close", "Position", "Tilt", "Stop"]);
		expect(
			alexaCompatibility("cover.g", state({ device_class: "garage" })).warnings,
		).toEqual(["Opening asks for a 4-digit voice PIN"]);
	});

	it("only supports temperature sensors", () => {
		expect(
			alexaCompatibility("sensor.t", state({ device_class: "temperature" }))
				.supported,
		).toBe(true);
		expect(
			alexaCompatibility("sensor.t", state({ unit_of_measurement: "°C" }))
				.supported,
		).toBe(true);
		const humidity = alexaCompatibility(
			"sensor.h",
			state({ device_class: "humidity" }),
		);
		expect(humidity).toEqual({
			supported: false,
			capabilities: [],
			warnings: ["Alexa only supports temperature sensors"],
		});
	});

	it("supports contact and motion binary sensors only", () => {
		expect(
			alexaCompatibility("binary_sensor.d", state({ device_class: "door" }))
				.capabilities,
		).toEqual(["Contact (open/closed)", "Routines"]);
		expect(
			alexaCompatibility("binary_sensor.m", state({ device_class: "motion" }))
				.supported,
		).toBe(true);
		const smoke = alexaCompatibility(
			"binary_sensor.s",
			state({ device_class: "smoke" }),
		);
		expect(smoke.supported).toBe(false);
		expect(smoke.warnings[0]).toContain('this one is "smoke"');
	});

	it("reminds about proactive events only when they are off", () => {
		const door = state({ device_class: "door" });
		expect(alexaCompatibility("binary_sensor.d", door).warnings).toEqual([
			"Needs proactive events (Settings) to report changes",
		]);
		expect(alexaCompatibility("binary_sensor.d", door, true).warnings).toEqual(
			[],
		);
	});

	it("flags alarm panels that require a code to arm", () => {
		expect(
			alexaCompatibility(
				"alarm_control_panel.home",
				state({ code_arm_required: true }),
			).supported,
		).toBe(false);
		expect(
			alexaCompatibility("alarm_control_panel.home", state({})).supported,
		).toBe(true);
	});

	it("handles unsupported domains and missing state", () => {
		expect(alexaCompatibility("weather.home", undefined)).toEqual({
			supported: false,
			capabilities: [],
			warnings: ["The weather domain is not supported by Alexa"],
		});
		expect(alexaCompatibility("switch.a", undefined).capabilities).toEqual([
			"On/off",
		]);
	});

	it.each([
		["scene.x", "Activate"],
		["script.x", "Run"],
		["button.x", "Press"],
		["lock.x", "Lock/unlock"],
		["fan.x", "On/off"],
		["climate.x", "Target temperature"],
		["media_player.x", "Volume"],
		["vacuum.x", "Start/stop"],
		["valve.x", "Open/close"],
		["humidifier.x", "Target humidity"],
		["water_heater.x", "Mode"],
		["input_number.x", "Set value"],
		["timer.x", "Start/pause/cancel"],
		["remote.x", "Activity"],
		["camera.x", "Video stream"],
		["image_processing.x", "Presence"],
	])("%s supports %s", (id, capability) => {
		expect(alexaCompatibility(id, state({})).capabilities).toContain(
			capability,
		);
	});
});

describe("alexaCompatibility feature flags", () => {
	const s = (attributes: Record<string, unknown>) => ({
		state: "on",
		attributes,
	});

	it("fan features", () => {
		expect(
			alexaCompatibility("fan.f", s({ supported_features: 1 | 2 | 4 | 8 }))
				.capabilities,
		).toEqual(["On/off", "Speed", "Preset mode", "Oscillation", "Direction"]);
		expect(
			alexaCompatibility("fan.f", s({ percentage: 50 })).capabilities,
		).toContain("Speed");
	});

	it("vacuum, valve and climate details", () => {
		expect(
			alexaCompatibility("vacuum.v", s({ supported_features: 4 })).capabilities,
		).toEqual(["Start/stop", "Pause/resume"]);
		expect(
			alexaCompatibility("valve.v", s({ supported_features: 4 })).capabilities,
		).toEqual(["Open/close", "Position"]);
		expect(
			alexaCompatibility("climate.c", s({ hvac_modes: ["heat"] })).capabilities,
		).toEqual(["Target temperature", "Mode"]);
	});

	it("events: doorbell only", () => {
		expect(
			alexaCompatibility("event.d", s({ device_class: "doorbell" })).supported,
		).toBe(true);
		expect(
			alexaCompatibility("event.b", s({ device_class: "button" })).supported,
		).toBe(false);
	});

	it("binary sensor without device class", () => {
		expect(
			alexaCompatibility("binary_sensor.x", s({})).warnings[0],
		).not.toContain("this one is");
	});
});
