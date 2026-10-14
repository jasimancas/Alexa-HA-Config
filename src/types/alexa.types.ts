/** Per-entity Alexa settings (alexa.smart_home.entity_config.<entity_id>) */
export type AlexaEntityConfig = {
	name?: string;
	description?: string;
	/** Comma-separated Alexa display categories; the first one is primary */
	display_categories?: string;
};

export type SecretFinding = {
	key: string;
	/** YAML path inside the file that holds it, e.g. alexa.smart_home.client_id */
	path: string;
	state: "missing" | "secret" | "env" | "plaintext";
};

export type AlexaRegion = "na" | "eu" | "fe";

export type AlexaSettings = {
	locale: string;
	region: AlexaRegion | "custom" | "";
	secrets: SecretFinding[];
	/** endpoint + client_id + client_secret are configured */
	proactiveEvents: boolean;
};

export type AlexaSettingsUpdate = {
	locale?: string | null;
	region?: AlexaRegion | null;
	/** Write-only: stored in secrets.yaml, never read back */
	clientId?: string | null;
	clientSecret?: string | null;
};

export type AlexaCompatibility = {
	supported: boolean;
	/** What Alexa can do with it, e.g. "On/off", "Brightness" */
	capabilities: string[];
	warnings: string[];
};
