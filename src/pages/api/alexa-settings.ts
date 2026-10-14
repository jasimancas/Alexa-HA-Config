import type { NextApiRequest, NextApiResponse } from "next";
import type { AlexaSettingsUpdate } from "@/types/alexa.types";
import {
	migrateSecrets,
	readAlexaConfig,
	updateAlexaSettings,
} from "@/utils/ha-config.util";

/**
 * GET  -> locale, region, credential status (never the values)
 * POST -> { locale?, region?, clientId?, clientSecret? }
 * POST { action: "migrate-secrets" } -> moves plain-text credentials to secrets.yaml
 */
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		if (req.method === "GET") {
			const {
				includeEntities: _i,
				entityConfig: _e,
				...settings
			} = await readAlexaConfig();
			return res.status(200).json({ success: true, data: settings });
		}

		if (req.method === "POST") {
			const body = req.body ?? {};
			if (typeof body !== "object" || Array.isArray(body)) {
				return res
					.status(400)
					.json({ success: false, error: "Invalid request body" });
			}

			if (body.action === "migrate-secrets") {
				const result = await migrateSecrets();
				return res.status(200).json({ success: true, ...result });
			}

			const update: AlexaSettingsUpdate = {};
			for (const key of [
				"locale",
				"region",
				"clientId",
				"clientSecret",
			] as const) {
				if (!(key in body)) continue;
				const value = body[key];
				if (value !== null && typeof value !== "string") {
					return res
						.status(400)
						.json({ success: false, error: `Invalid ${key}` });
				}
				// Empty string clears locale/region; credentials are write-only
				(update as Record<string, string | null>)[key] =
					value === "" && (key === "locale" || key === "region") ? null : value;
			}
			const result = await updateAlexaSettings(update);
			return res.status(200).json({ success: true, ...result });
		}

		return res
			.status(405)
			.json({ success: false, error: "Method not allowed. Use GET or POST." });
	} catch (error) {
		console.error("Alexa settings error:", error);
		const message = (error as Error).message;
		const isValidation = /^(Invalid|Unsupported)/.test(message);
		return res
			.status(isValidation ? 400 : 500)
			.json({ success: false, error: message });
	}
}
