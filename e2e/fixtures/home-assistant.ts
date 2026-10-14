import type { Area, Device, Entity } from "../../src/types/home-assistant.types";

export const mockDevices: Device[] = [
	{
		id: "device-1",
		name: "Philips Hue Bridge",
		model: "BSB002",
		manufacturer: "Philips",
		area_id: "area-living-room",
	},
	{
		id: "device-2",
		name: "Smart Thermostat",
		model: "T3000",
		manufacturer: "Ecobee",
		area_id: "area-hallway",
	},
	{
		id: "device-3",
		name: "Motion Sensor",
		model: "SML001",
		manufacturer: "Philips",
		area_id: "area-bedroom",
	},
	{
		id: "device-4",
		name: "Smart Plug",
		model: "HS110",
		manufacturer: "TP-Link",
		area_id: "area-kitchen",
	},
	{
		id: "device-5",
		name: "Door Lock",
		model: "BE469ZP",
		manufacturer: "Schlage",
		area_id: "area-front-door",
	},
];

export const mockEntities: Entity[] = [
	{
		id: "entity-1",
		entity_id: "light.living_room_ceiling",
		entity_category: null,
		name: "Living Room Ceiling Light",
		area_id: "area-living-room",
		device_id: "device-1",
	},
	{
		id: "entity-2",
		entity_id: "light.living_room_lamp",
		entity_category: null,
		name: "Living Room Lamp",
		area_id: "area-living-room",
		device_id: "device-1",
	},
	{
		id: "entity-3",
		entity_id: "climate.thermostat",
		entity_category: null,
		name: "Main Thermostat",
		area_id: "area-hallway",
		device_id: "device-2",
	},
	{
		id: "entity-4",
		entity_id: "binary_sensor.motion_bedroom",
		entity_category: null,
		name: "Bedroom Motion",
		area_id: "area-bedroom",
		device_id: "device-3",
	},
	{
		id: "entity-5",
		entity_id: "switch.coffee_maker",
		entity_category: null,
		name: "Coffee Maker",
		area_id: "area-kitchen",
		device_id: "device-4",
	},
	{
		id: "entity-6",
		entity_id: "switch.tv_power",
		entity_category: null,
		name: "TV Power",
		area_id: "area-living-room",
		device_id: "device-4",
	},
	{
		id: "entity-7",
		entity_id: "sensor.temperature_living_room",
		entity_category: null,
		name: "Living Room Temperature",
		area_id: "area-living-room",
		device_id: "device-2",
	},
	{
		id: "entity-8",
		entity_id: "automation.morning_routine",
		entity_category: null,
		name: "Morning Routine",
		area_id: null,
		device_id: "device-1",
	},
	{
		id: "entity-9",
		entity_id: "scene.movie_night",
		entity_category: null,
		name: "Movie Night",
		area_id: "area-living-room",
		device_id: "device-1",
	},
	{
		id: "entity-10",
		entity_id: "button.doorbell",
		entity_category: null,
		name: "Doorbell",
		area_id: "area-front-door",
		device_id: "device-5",
	},
	// Add more entities to test pagination (need 15+ for multiple pages)
	{
		id: "entity-11",
		entity_id: "light.bedroom_ceiling",
		entity_category: null,
		name: "Bedroom Ceiling Light",
		area_id: "area-bedroom",
		device_id: "device-1",
	},
	{
		id: "entity-12",
		entity_id: "light.kitchen_under_cabinet",
		entity_category: null,
		name: "Kitchen Under Cabinet",
		area_id: "area-kitchen",
		device_id: "device-1",
	},
];

export const mockAreas: Area[] = [
	{
		area_id: "area-living-room",
		name: "Living Room",
		floor_id: "floor-1",
	},
	{
		area_id: "area-bedroom",
		name: "Bedroom",
		floor_id: "floor-2",
	},
	{
		area_id: "area-kitchen",
		name: "Kitchen",
		floor_id: "floor-1",
	},
	{
		area_id: "area-hallway",
		name: "Hallway",
		floor_id: "floor-1",
	},
	{
		area_id: "area-front-door",
		name: "Front Door",
		floor_id: "floor-1",
	},
];
