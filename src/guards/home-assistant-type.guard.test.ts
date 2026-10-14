import { describe, expect, it } from "vitest";
import {
	type Area,
	type Device,
	type Entity,
	type MessageData,
	MessageType,
	RequestTypeId,
} from "@/types/home-assistant.types";
import {
	DOMAINS,
	isAreaResult,
	isAuthOk,
	isAuthRequired,
	isDeviceResult,
	isEntityResult,
	isValidEntity,
} from "./home-assistant-type.guard";

describe("home-assistant-type.guard", () => {
	describe("isDeviceResult", () => {
		it("should return true for valid device result message", () => {
			const message: MessageData<Device[]> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_DEVICES,
				result: [
					{
						id: "device1",
						name: "Smart Light",
						model: "Hue Bulb",
						manufacturer: "Philips",
						area_id: "living_room",
					},
				],
			};

			expect(isDeviceResult(message)).toBe(true);
		});

		it("should return false for result with wrong id", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_ENTITIES,
			};

			expect(isDeviceResult(message)).toBe(false);
		});

		it("should return false for wrong message type", () => {
			const message: MessageData<unknown> = {
				type: MessageType.AUTH_OK,
				id: RequestTypeId.GET_DEVICES,
			};

			expect(isDeviceResult(message)).toBe(false);
		});

		it("should return false for message without id", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
			};

			expect(isDeviceResult(message)).toBe(false);
		});
	});

	describe("isEntityResult", () => {
		it("should return true for valid entity result message", () => {
			const message: MessageData<Entity[]> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_ENTITIES,
				result: [
					{
						id: "entity1",
						entity_id: "light.living_room",
						entity_category: "",
						name: "Living Room Light",
						area_id: "living_room",
						device_id: "device1",
					},
				],
			};

			expect(isEntityResult(message)).toBe(true);
		});

		it("should return false for result with wrong id", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_DEVICES,
			};

			expect(isEntityResult(message)).toBe(false);
		});

		it("should return false for wrong message type", () => {
			const message: MessageData<unknown> = {
				type: MessageType.AUTH_REQUIRED,
				id: RequestTypeId.GET_ENTITIES,
			};

			expect(isEntityResult(message)).toBe(false);
		});
	});

	describe("isAreaResult", () => {
		it("should return true for valid area result message", () => {
			const message: MessageData<Area[]> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_AREAS,
				result: [
					{
						area_id: "living_room",
						name: "Living Room",
						floor_id: "ground_floor",
					},
				],
			};

			expect(isAreaResult(message)).toBe(true);
		});

		it("should return false for result with wrong id", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_DEVICES,
			};

			expect(isAreaResult(message)).toBe(false);
		});

		it("should return false for wrong message type", () => {
			const message: MessageData<unknown> = {
				type: MessageType.AUTH_OK,
				id: RequestTypeId.GET_AREAS,
			};

			expect(isAreaResult(message)).toBe(false);
		});
	});

	describe("isAuthRequired", () => {
		it("should return true for auth_required message", () => {
			const message: MessageData<undefined> = {
				type: MessageType.AUTH_REQUIRED,
			};

			expect(isAuthRequired(message)).toBe(true);
		});

		it("should return false for other message types", () => {
			const message: MessageData<undefined> = {
				type: MessageType.AUTH_OK,
			};

			expect(isAuthRequired(message)).toBe(false);
		});

		it("should return false for result message", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_DEVICES,
			};

			expect(isAuthRequired(message)).toBe(false);
		});
	});

	describe("isAuthOk", () => {
		it("should return true for auth_ok message", () => {
			const message: MessageData<undefined> = {
				type: MessageType.AUTH_OK,
			};

			expect(isAuthOk(message)).toBe(true);
		});

		it("should return false for other message types", () => {
			const message: MessageData<undefined> = {
				type: MessageType.AUTH_REQUIRED,
			};

			expect(isAuthOk(message)).toBe(false);
		});

		it("should return false for result message", () => {
			const message: MessageData<unknown> = {
				type: MessageType.RESULT,
				id: RequestTypeId.GET_ENTITIES,
			};

			expect(isAuthOk(message)).toBe(false);
		});
	});

	describe("isValidEntity", () => {
		it("should return true for valid switch entity", () => {
			const entity: Entity = {
				id: "1",
				entity_id: "switch.living_room",
				entity_category: "",
				name: "Living Room Switch",
				area_id: "living_room",
				device_id: "device1",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid light entity", () => {
			const entity: Entity = {
				id: "2",
				entity_id: "light.bedroom",
				entity_category: "",
				name: "Bedroom Light",
				area_id: "bedroom",
				device_id: "device2",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid scene entity", () => {
			const entity = {
				entity_id: "scene.movie_time",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid sensor entity", () => {
			const entity = {
				entity_id: "sensor.temperature",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid binary_sensor entity", () => {
			const entity = {
				entity_id: "binary_sensor.motion",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid climate entity", () => {
			const entity = {
				entity_id: "climate.thermostat",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid button entity", () => {
			const entity = {
				entity_id: "button.doorbell",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return true for valid automation entity", () => {
			const entity = {
				entity_id: "automation.turn_on_lights",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(true);
		});

		it("should return false for invalid domain", () => {
			const entity = {
				entity_id: "media_player.spotify",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(false);
		});

		it("should return false for entity without entity_id", () => {
			const entity = {
				id: "1",
				name: "Test",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(false);
		});

		it("should return false for null", () => {
			expect(isValidEntity(DOMAINS)(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isValidEntity(DOMAINS)(undefined)).toBe(false);
		});

		it("should return false for non-object values", () => {
			expect(isValidEntity(DOMAINS)("string")).toBe(false);
			expect(isValidEntity(DOMAINS)(123)).toBe(false);
			expect(isValidEntity(DOMAINS)(true)).toBe(false);
		});

		it("should return false for empty object", () => {
			expect(isValidEntity(DOMAINS)({})).toBe(false);
		});

		it("should return false for malformed entity_id", () => {
			const entity = {
				entity_id: "invalid",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(false);
		});

		it("should return false for entity_id with empty domain", () => {
			const entity = {
				entity_id: ".living_room",
			};

			expect(isValidEntity(DOMAINS)(entity)).toBe(false);
		});
	});
});
