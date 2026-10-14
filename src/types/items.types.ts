import type {
	AlexaCompatibility,
	AlexaEntityConfig,
} from "@/types/alexa.types";
import type { Area, Device, Entity } from "@/types/home-assistant.types";

export type CompiledArea = Omit<Area, "floor_id">;

export type CompiledEntity = Omit<Entity, "area_id" | "device_id"> & {
	shared: boolean;
	/** Published alexa.smart_home.entity_config for this entity */
	alexa?: AlexaEntityConfig;
	compatibility?: AlexaCompatibility;
	area?: CompiledArea;
	device: CompiledDevice;
};

export type CompiledDevice = Omit<Device, "area_id">;
