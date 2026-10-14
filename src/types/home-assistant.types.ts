export type Device = {
	id: string;
	name: string;
	name_by_user?: string | null;
	model: string;
	manufacturer: string;
	area_id: string | null;
};

export type Entity = {
	id: string;
	entity_id: string;
	entity_category: string | null;
	name: string | null;
	original_name?: string | null;
	area_id: string | null;
	device_id: string | null;
	disabled_by?: string | null;
};

export type Area = {
	area_id: string;
	name: string;
	floor_id: string;
};

export type MessageData<T> = {
	type: MessageType;
	id?: number;
	success?: boolean;
	result?: T | undefined;
	message?: string;
	error?: { code: string; message: string };
};

export enum MessageType {
	AUTH_REQUIRED = "auth_required",
	AUTH_OK = "auth_ok",
	AUTH_INVALID = "auth_invalid",
	RESULT = "result",
	AUTH = "auth",
	GET_DEVICES = "config/device_registry/list",
	GET_ENTITIES = "config/entity_registry/list",
	GET_AREAS = "config/area_registry/list",
	GET_CONFIG = "get_config",
	GET_STATES = "get_states",
}
export enum RequestTypeId {
	GET_DEVICES = 2,
	GET_ENTITIES = 3,
	GET_AREAS = 4,
	GET_CONFIG = 5,
	GET_STATES = 6,
}

export type State = {
	entity_id: string;
	state: string;
	attributes: Record<string, unknown>;
};
