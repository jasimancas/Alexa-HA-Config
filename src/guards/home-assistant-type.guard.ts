import {
	type Area,
	type Device,
	type Entity,
	type MessageData,
	MessageType,
	RequestTypeId,
} from "@/types/home-assistant.types";
import type { WithRequiredProperty } from "@/types/utility.types";

const isMessage = (data: unknown): data is MessageData<unknown> =>
	!!data && typeof data === "object" && "type" in data;

export const DOMAINS = [
	"switch",
	"scene",
	"sensor",
	"binary_sensor",
	"light",
	"climate",
	"button",
	"automation",
];

export const isDeviceResult = (
	data: MessageData<unknown>,
): data is WithRequiredProperty<MessageData<Device[]>, "result"> =>
	data.type === MessageType.RESULT && data.id === RequestTypeId.GET_DEVICES;

export const isEntityResult = (
	data: MessageData<unknown>,
): data is WithRequiredProperty<MessageData<Entity[]>, "result"> =>
	data.type === MessageType.RESULT && data.id === RequestTypeId.GET_ENTITIES;

export const isAreaResult = (
	data: MessageData<unknown>,
): data is WithRequiredProperty<MessageData<Area[]>, "result"> =>
	data.type === MessageType.RESULT && data.id === RequestTypeId.GET_AREAS;

export const isAuthRequired = (
	data: MessageData<unknown>,
): data is MessageData<undefined> => data.type === MessageType.AUTH_REQUIRED;

export const isAuthOk = (
	data: MessageData<unknown>,
): data is MessageData<undefined> => data.type === MessageType.AUTH_OK;

export const isAuthInvalid = (data: unknown): data is MessageData<undefined> =>
	isMessage(data) && data.type === MessageType.AUTH_INVALID;

export const isErrorResult = (data: unknown): data is MessageData<undefined> =>
	isMessage(data) && data.type === MessageType.RESULT && data.success === false;

export const isValidEntity =
	(domains: string[]) =>
	(item: unknown): item is Entity =>
		!!item &&
		typeof item === "object" &&
		Object.hasOwn(item, "entity_id") &&
		domains.includes((item as Entity).entity_id.split(".")[0]);
