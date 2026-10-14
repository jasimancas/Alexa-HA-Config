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
	isValidEntity,
} from "@/guards/home-assistant-type.guard";
import {
	type Area,
	type Device,
	type Entity,
	type MessageData,
	MessageType,
	RequestTypeId,
} from "@/types/home-assistant.types";
import type { CompiledEntity } from "@/types/items.types";
import { getAddonOptions } from "@/utils/addon-options.util";
import { getSharedEntityIds } from "@/utils/ha-config.util";

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
	const entityIds = new Set(await getSharedEntityIds());
	const domains = config.haEntityDomains ?? DOMAINS;

	return new Promise((resolve, reject) => {
		const ws = new WebSocket(websocketUrl);
		let devices: Device[] | undefined;
		let entities: Entity[] | undefined;
		let areas: Area[] | undefined;

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

			// Each registry can legitimately be empty; wait until all three answered
			if (devices && entities && areas) {
				clearTimeout(timer);
				ws.close();
				resolve(compile(devices, entities, areas, domains, entityIds));
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
	domains: string[],
	selectedEntityIds: Set<string>,
): CompiledEntity[] => {
	const deviceMap = new Map(devices.map((d) => [d.id, d]));
	const areaMap = new Map(areas.map((a) => [a.area_id, a]));

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

			return {
				id: entity.id,
				entity_id: entity.entity_id,
				name: entity.name ?? entity.original_name ?? device?.name ?? "",
				entity_category: entity.entity_category,
				shared: selectedEntityIds.has(entity.entity_id),
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
