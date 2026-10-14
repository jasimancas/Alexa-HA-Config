import fs from "node:fs/promises";
import { camelCase, mapKeys } from "lodash";
import { DOMAINS } from "@/guards/home-assistant-type.guard";

export const OPTIONS_PATH = `${process.env.HA_CONF_PATH ?? "/"}data/options.json`;

export interface AddonOptions {
	haWebsocketUrl?: string;
	haAccessToken?: string;
	haEntityDomains?: string[];
}

export const DEFAULT_OPTIONS: AddonOptions = {
	haWebsocketUrl: "http://homeassistant.local:8123",
	haAccessToken: undefined,
	haEntityDomains: DOMAINS,
};

let cachedOptions: AddonOptions | null = null;

/**
 * Reads the addon options from /data/options.json
 * Home Assistant writes addon configuration options to this file
 */
export async function getAddonOptions(): Promise<AddonOptions> {
	if (cachedOptions) {
		return cachedOptions;
	}

	try {
		const content = await fs.readFile(OPTIONS_PATH, "utf-8");
		const parsed = mapKeys(
			JSON.parse(content) as Partial<AddonOptions>,
			(_value: unknown, key: string) => camelCase(key),
		) as Partial<AddonOptions>;
		cachedOptions = { ...DEFAULT_OPTIONS, ...parsed };
		return cachedOptions;
	} catch {
		// File doesn't exist or can't be read, return defaults
		return DEFAULT_OPTIONS;
	}
}

/**
 * Clears the cached options (useful for testing)
 */
export function clearOptionsCache(): void {
	cachedOptions = null;
}
