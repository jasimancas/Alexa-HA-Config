import type { NextApiRequest, NextApiResponse } from "next";
import WebSocket, { type RawData } from "ws";
import {
	DOMAINS,
	isAreaResult,
	isAuthInvalid,
	isAuthOk,
	isDeviceResult,
	isEntityResult,
	isErrorResult,
	isStatesResult,
	isValidEntity,
} from "@/guards/home-assistant-type.guard";
import type { AlexaEntityConfig } from "@/types/alexa.types";
import {
	type Area,
	type Device,
	type Entity,
	type MessageData,
	MessageType,
	RequestTypeId,
	type State,
} from "@/types/home-assistant.types";
import type { CompiledEntity } from "@/types/items.types";
import { getAddonOptions } from "@/utils/addon-options.util";
import { alexaCompatibility } from "@/utils/alexa-compat.util";
import { readAlexaConfig } from "@/utils/ha-config.util";

export const WS_TIMEOUT_MS = 15_000;

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "GET") {
		try {
			const entities = await loadData();
			return res.status(200).json({ success: true, data: entities });
		} catch (err) {
			console.error(err);
			return res
				.status(500)
				.json({ success: false, error: (err as Error).message });
		}
	}

	return res.status(405).json({
		success: false,
		error: "Method not allowed. Use GET.",
	});
}

const loadData = async (): Promise<CompiledEntity[]> => {
	const config = await getAddonOptions();
	const token = process.env.SUPERVISOR_TOKEN || config.haAccessToken || "";
	const websocketUrl =
		process.env.HA_WEBSOCKET_URL ??
		config.haWebsocketUrl ??
		"ws://supervisor/core/websocket";
	const alexa = await readAlexaConfig();
	const entityIds = new Set(alexa.includeEntities);
	const domains = config.haEntityDomains ?? DOMAINS;

	return new Promise((resolve, reject) => {
		const ws = new WebSocket(websocketUrl);
		let devices: Device[] | undefined;
		let entities: Entity[] | undefined;
		let areas: Area[] | undefined;
		let states: State[] | undefined;

		const fail = (error: Error) => {
			clearTimeout(timer);
			ws.close();
			reject(error);
		};
		const timer = setTimeout(
			() =>
				fail(
					new Error(
						`Timed out after ${WS_TIMEOUT_MS / 1000}s waiting for Home Assistant at ${websocketUrl}`,
					),
				),
			WS_TIMEOUT_MS,
		);

		ws.on("open", () => {
			ws.send(JSON.stringify({ type: "auth", access_token: token }));
		});

		ws.on("message", (msg: RawData) => {
			let data: MessageData<unknown>;
			try {
				data = JSON.parse(rawToString(msg));
			} catch {
				return fail(new Error("Invalid message from Home Assistant"));
			}

			if (isAuthInvalid(data)) {
				return fail(
					new Error(
						`Home Assistant rejected the access token${data.message ? `: ${data.message}` : ""}`,
					),
				);
			}

			if (isAuthOk(data)) {
				for (const [type, id] of [
					[MessageType.GET_DEVICES, RequestTypeId.GET_DEVICES],
					[MessageType.GET_ENTITIES, RequestTypeId.GET_ENTITIES],
					[MessageType.GET_AREAS, RequestTypeId.GET_AREAS],
					[MessageType.GET_STATES, RequestTypeId.GET_STATES],
				] as const) {
					ws.send(JSON.stringify({ type, id }));
				}
				return;
			}

			if (isErrorResult(data)) {
				return fail(
					new Error(
						`Home Assistant error: ${data.error?.message ?? "unknown error"}`,
					),
				);
			}

			if (isDeviceResult(data)) devices = data.result;
			if (isEntityResult(data)) entities = data.result;
			if (isAreaResult(data)) areas = data.result;
			if (isStatesResult(data)) states = data.result;

			// Each registry can legitimately be empty; wait until all answered
			if (devices && entities && areas && states) {
				clearTimeout(timer);
				ws.close();
				resolve(
					compile(
						devices,
						entities,
						areas,
						states,
						domains,
						entityIds,
						alexa.entityConfig,
					),
				);
			}
		});

		ws.on("error", (error: Error) => fail(error));
		ws.on("close", () =>
			fail(new Error("Connection to Home Assistant closed unexpectedly")),
		);
	});
};

const rawToString = (data: WebSocket.RawData): string => {
	if (Buffer.isBuffer(data)) return data.toString("utf8");
	if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
	return Buffer.from(data).toString("utf8");
};

const compile = (
	devices: Device[],
	entities: Entity[],
	areas: Area[],
	states: State[],
	domains: string[],
	selectedEntityIds: Set<string>,
	entityConfig: Record<string, AlexaEntityConfig>,
): CompiledEntity[] => {
	const deviceMap = new Map(devices.map((d) => [d.id, d]));
	const areaMap = new Map(areas.map((a) => [a.area_id, a]));
	const stateMap = new Map(states.map((s) => [s.entity_id, s]));

	return entities
		.filter(isValidEntity(domains))
		.filter((e) => !e.disabled_by || selectedEntityIds.has(e.entity_id))
		.map((entity) => {
			const device = entity.device_id
				? deviceMap.get(entity.device_id)
				: undefined;
			// Entity area overrides the device area, as in the HA UI
			const areaId = entity.area_id ?? device?.area_id;
			const area = areaId ? areaMap.get(areaId) : undefined;
			const state = stateMap.get(entity.entity_id);

			return {
				id: entity.id,
				entity_id: entity.entity_id,
				name:
					entity.name ??
					entity.original_name ??
					(state?.attributes.friendly_name as string | undefined) ??
					device?.name ??
					"",
				entity_category: entity.entity_category,
				shared: selectedEntityIds.has(entity.entity_id),
				alexa: entityConfig[entity.entity_id] ?? {},
				// The UI hides the proactive-events hint once they are configured
				compatibility: alexaCompatibility(entity.entity_id, state),
				device: {
					id: device?.id ?? "",
					name: device?.name_by_user ?? device?.name ?? "",
					manufacturer: device?.manufacturer ?? "",
					model: device?.model ?? "",
				},
				area: {
					area_id: area?.area_id ?? "",
					name: area?.name ?? "",
				},
			};
		});
};
