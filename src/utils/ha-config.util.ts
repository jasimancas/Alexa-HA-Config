import {
	type Document,
	isMap,
	isScalar,
	isSeq,
	type Node,
	Scalar,
	type YAMLMap,
} from "yaml";
import { ALEXA_DISPLAY_CATEGORIES, ALEXA_LOCALES } from "@/configs/alexa";
import type {
	AlexaEntityConfig,
	AlexaSettings,
	AlexaSettingsUpdate,
	SecretFinding,
} from "@/types/alexa.types";
import {
	ensureParents,
	type Location,
	nodeAt,
	secretsPath,
	YamlWorkspace,
} from "./yaml-store.util";

export {
	createBackup,
	MAX_BACKUPS,
	parseYAML,
	stringifyYAML,
	writeFileAtomic,
} from "./yaml-store.util";

const SMART_HOME = ["alexa", "smart_home"];
const FILTER_PATH = [...SMART_HOME, "filter", "include_entities"];
const ENTITY_CONFIG_PATH = [...SMART_HOME, "entity_config"];

export const ALEXA_ENDPOINTS = {
	na: "https://api.amazonalexa.com/v3/events",
	eu: "https://api.eu.amazonalexa.com/v3/events",
	fe: "https://api.fe.amazonalexa.com/v3/events",
} as const;

/** Keys under `alexa:` that hold credentials and belong in secrets.yaml */
const SENSITIVE_KEY =
	/^(client_id|client_secret|.*(password|token|secret|api_key).*)$/i;

/**
 * Validates entity ID format (domain.object_id)
 */
export function validateEntityIds(entityIds: unknown[]): boolean {
	const entityIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
	return entityIds.every(
		(id) => typeof id === "string" && entityIdPattern.test(id),
	);
}

/** Kept for backwards compatibility with callers that only need the filter */
export async function locateFilter(): Promise<Location> {
	return new YamlWorkspace().locate(FILTER_PATH);
}

function toPlain(value: unknown): unknown {
	if (value && typeof value === "object" && "toJSON" in value) {
		return (value as { toJSON: () => unknown }).toJSON();
	}
	return value;
}

async function readPath(ws: YamlWorkspace, yamlPath: string[]) {
	const loc = await ws.locate(yamlPath);
	return { loc, node: nodeAt(loc) };
}

/**
 * Reads the entity IDs currently exposed to Alexa
 */
export async function getSharedEntityIds(
	ws = new YamlWorkspace(),
): Promise<string[]> {
	const { loc, node } = await readPath(ws, FILTER_PATH);
	if (loc.path.length > 0 && node === undefined) return [];
	const list = toPlain(node);
	return Array.isArray(list) ? list.map(String) : [];
}

/**
 * Sets include_entities in-place: keeps the existing sequence items (and
 * their comments) that are still selected, drops the rest, appends new ones.
 */
export function setIncludeEntities(
	doc: Document,
	yamlPath: string[],
	entityIds: string[],
): void {
	const wanted = [...new Set(entityIds)].sort();
	const existing =
		yamlPath.length === 0 ? doc.contents : doc.getIn(yamlPath, true);

	if (!isSeq(existing)) {
		if (yamlPath.length === 0) {
			doc.contents = doc.createNode(wanted) as typeof doc.contents;
		} else {
			ensureParents(doc, yamlPath);
			doc.setIn(yamlPath, doc.createNode(wanted));
		}
		return;
	}

	const wantedSet = new Set(wanted);
	existing.items = existing.items.filter((item) => {
		const id = isScalar(item) ? String(item.value) : undefined;
		if (id && wantedSet.has(id)) {
			wantedSet.delete(id);
			return true;
		}
		return false;
	});
	for (const id of wantedSet) {
		existing.add(doc.createNode(id));
	}
	existing.flow = false;
}

/* ------------------------------ entity_config ----------------------------- */

const ENTITY_CONFIG_FIELDS = [
	"name",
	"description",
	"display_categories",
] as const;

/**
 * Normalises and validates a per-entity Alexa config. Empty fields are
 * dropped; returns null when nothing is left.
 */
export function normalizeEntityConfig(
	input: unknown,
): AlexaEntityConfig | null {
	if (input === null || input === undefined) return null;
	if (typeof input !== "object") throw new Error("Invalid entity config");

	const out: AlexaEntityConfig = {};
	for (const field of ENTITY_CONFIG_FIELDS) {
		const raw = (input as Record<string, unknown>)[field];
		if (raw === undefined || raw === null) continue;
		if (typeof raw !== "string") {
			throw new Error(`Invalid ${field}: expected text`);
		}
		const value = raw.trim();
		if (!value) continue;
		if (value.length > 128 || /[\r\n]/.test(value)) {
			throw new Error(`Invalid ${field}: max 128 characters, single line`);
		}
		if (field === "display_categories") {
			const categories = value.split(",").map((c) => c.trim().toUpperCase());
			const unknown = categories.filter(
				(c) => !(ALEXA_DISPLAY_CATEGORIES as readonly string[]).includes(c),
			);
			if (unknown.length > 0) {
				throw new Error(`Unknown display category: ${unknown.join(", ")}`);
			}
			out.display_categories = categories.join(",");
		} else {
			out[field] = value;
		}
	}
	return Object.keys(out).length > 0 ? out : null;
}

function readEntityConfigMap(node: unknown): Record<string, AlexaEntityConfig> {
	const plain = toPlain(node);
	if (!plain || typeof plain !== "object" || Array.isArray(plain)) return {};
	const out: Record<string, AlexaEntityConfig> = {};
	for (const [id, value] of Object.entries(plain)) {
		if (!value || typeof value !== "object") continue;
		const cfg: AlexaEntityConfig = {};
		for (const field of ENTITY_CONFIG_FIELDS) {
			const v = (value as Record<string, unknown>)[field];
			if (v !== undefined && v !== null) {
				cfg[field] = Array.isArray(v) ? v.join(",") : String(v);
			}
		}
		out[id] = cfg;
	}
	return out;
}

/**
 * Applies per-entity changes to entity_config, editing fields in place so
 * comments and unrelated keys (e.g. domain-level entries) survive.
 */
async function applyEntityConfig(
	ws: YamlWorkspace,
	changes: Record<string, AlexaEntityConfig | null>,
): Promise<void> {
	if (Object.keys(changes).length === 0) return;
	const loc = await ws.locate(ENTITY_CONFIG_PATH);
	const { doc } = loc;

	let map = nodeAt(loc);
	if (!isMap(map)) {
		if (Object.values(changes).every((c) => c === null)) return;
		if (loc.path.length === 0) {
			doc.contents = doc.createNode({}) as typeof doc.contents;
		} else {
			ensureParents(doc, loc.path);
			doc.setIn(loc.path, doc.createNode({}));
		}
		map = nodeAt(loc);
	}
	const entityMap = map as YAMLMap;

	for (const [entityId, cfg] of Object.entries(changes)) {
		if (!cfg) {
			entityMap.delete(entityId);
			continue;
		}
		let entry = entityMap.get(entityId, true) as Node | undefined;
		if (!isMap(entry)) {
			entityMap.set(entityId, doc.createNode({}));
			entry = entityMap.get(entityId, true) as Node;
		}
		const entryMap = entry as YAMLMap;
		for (const field of ENTITY_CONFIG_FIELDS) {
			const value = cfg[field];
			if (!value) {
				entryMap.delete(field);
				continue;
			}
			const current = entryMap.get(field, true);
			if (isScalar(current)) {
				current.value = value;
			} else {
				entryMap.set(field, value);
			}
		}
	}

	if (entityMap.items.length === 0 && loc.path.length > 0) {
		doc.deleteIn(loc.path);
	}
}

/* --------------------------------- secrets -------------------------------- */

type SecretNode = {
	loc: Location;
	key: string;
	node: Scalar;
};

/** Walks alexa.* (following !include) collecting credential-like scalars */
async function findSensitiveNodes(ws: YamlWorkspace): Promise<SecretNode[]> {
	const found: SecretNode[] = [];
	const visit = async (yamlPath: string[]): Promise<void> => {
		const { loc, node } = await readPath(ws, yamlPath);
		if (!isMap(node)) return;
		for (const pair of node.items) {
			const key = isScalar(pair.key) ? String(pair.key.value) : undefined;
			if (!key || key === "entity_config" || key === "filter") continue;
			const child = pair.value;
			if (isScalar(child) && child.tag === "!include") {
				await visit([...yamlPath, key]);
			} else if (isMap(child)) {
				await visit([...yamlPath, key]);
			} else if (isScalar(child) && SENSITIVE_KEY.test(key)) {
				found.push({
					loc: { ...loc, path: [...loc.path, key] },
					key,
					node: child,
				});
			}
		}
	};
	await visit(["alexa"]);
	return found;
}

function secretState(node: Scalar): SecretFinding["state"] {
	if (node.tag === "!secret") return "secret";
	if (node.tag === "!env_var") return "env";
	if (node.value === null || String(node.value).trim() === "") return "missing";
	return "plaintext";
}

/** Picks a secrets.yaml key, reusing one that already holds the same value */
function chooseSecretName(
	secrets: Document,
	base: string,
	value: string,
): string {
	let name = base;
	for (let n = 2; ; n++) {
		const existing = secrets.get(name);
		if (existing === undefined || String(existing) === value) return name;
		name = `${base}_${n}`;
	}
}

function setSecretRef(loc: Location, secretName: string): void {
	const ref = new Scalar(secretName);
	ref.tag = "!secret";
	const old = loc.doc.getIn(loc.path, true);
	if (isScalar(old)) {
		ref.comment = old.comment;
		ref.commentBefore = old.commentBefore;
	}
	loc.doc.setIn(loc.path, ref);
}

async function storeSecret(
	ws: YamlWorkspace,
	loc: Location,
	key: string,
	value: string,
): Promise<void> {
	const secrets = await ws.load(secretsPath(), true);
	if (secrets.contents === null) {
		secrets.contents = secrets.createNode(
			{},
		) as unknown as typeof secrets.contents;
	}
	const current = loc.doc.getIn(loc.path, true);
	// Keep using the secret name the config already points to
	const name =
		isScalar(current) && current.tag === "!secret"
			? String(current.value)
			: chooseSecretName(secrets, `alexa_${key}`, value);
	secrets.set(name, value);
	setSecretRef(loc, name);
}

/**
 * Moves every plain-text credential under `alexa:` into secrets.yaml and
 * replaces it with a `!secret` reference.
 */
export async function migrateSecrets(): Promise<{
	migrated: string[];
	files: string[];
}> {
	const ws = new YamlWorkspace();
	const findings = await findSensitiveNodes(ws);
	const migrated: string[] = [];

	for (const finding of findings) {
		if (secretState(finding.node) !== "plaintext") continue;
		await storeSecret(ws, finding.loc, finding.key, String(finding.node.value));
		migrated.push(finding.key);
	}

	const files = await ws.commit([secretsPath()]);
	return { migrated, files };
}

/* -------------------------------- settings -------------------------------- */

/**
 * Everything the UI needs about the Alexa section. Never returns secret values.
 */
export async function readAlexaConfig(): Promise<
	AlexaSettings & {
		includeEntities: string[];
		entityConfig: Record<string, AlexaEntityConfig>;
	}
> {
	const ws = new YamlWorkspace();
	const includeEntities = await getSharedEntityIds(ws);
	const { node: ecNode } = await readPath(ws, ENTITY_CONFIG_PATH);
	const { node: localeNode } = await readPath(ws, [...SMART_HOME, "locale"]);
	const { node: endpointNode } = await readPath(ws, [
		...SMART_HOME,
		"endpoint",
	]);

	const secrets: SecretFinding[] = (await findSensitiveNodes(ws)).map((f) => ({
		key: f.key,
		path: f.loc.path.join("."),
		state: secretState(f.node),
	}));
	for (const key of ["client_id", "client_secret"]) {
		if (!secrets.some((s) => s.key === key)) {
			secrets.push({
				key,
				path: [...SMART_HOME, key].join("."),
				state: "missing",
			});
		}
	}

	const locale = isScalar(localeNode) ? String(localeNode.value ?? "") : "";
	const endpoint = isScalar(endpointNode)
		? String(endpointNode.value ?? "")
		: "";
	const region =
		(Object.entries(ALEXA_ENDPOINTS).find(([, url]) => url === endpoint)?.[0] as
			| AlexaSettings["region"]
			| undefined) ?? (endpoint ? "custom" : "");

	const credsReady = ["client_id", "client_secret"].every((k) =>
		secrets.some((s) => s.key === k && s.state !== "missing"),
	);

	return {
		includeEntities,
		entityConfig: readEntityConfigMap(ecNode),
		locale,
		region,
		secrets,
		proactiveEvents: Boolean(endpoint) && credsReady,
	};
}

/**
 * Updates locale, proactive-events region and credentials. Credentials are
 * always written to secrets.yaml and referenced with `!secret`.
 */
export async function updateAlexaSettings(
	update: AlexaSettingsUpdate,
): Promise<{ files: string[] }> {
	const ws = new YamlWorkspace();

	const setValue = async (key: string, value: string | null) => {
		const loc = await ws.locate([...SMART_HOME, key]);
		if (value === null) {
			if (loc.path.length > 0 && loc.doc.hasIn(loc.path)) {
				loc.doc.deleteIn(loc.path);
			}
			return;
		}
		ensureParents(loc.doc, loc.path);
		const current = loc.doc.getIn(loc.path, true);
		if (isScalar(current) && !current.tag) current.value = value;
		else loc.doc.setIn(loc.path, value);
	};

	if (update.locale !== undefined) {
		if (
			update.locale !== null &&
			!(ALEXA_LOCALES as readonly string[]).includes(update.locale)
		) {
			throw new Error(`Unsupported locale: ${update.locale}`);
		}
		await setValue("locale", update.locale);
	}

	if (update.region !== undefined) {
		if (update.region !== null && !(update.region in ALEXA_ENDPOINTS)) {
			throw new Error(`Unsupported region: ${update.region}`);
		}
		await setValue(
			"endpoint",
			update.region === null ? null : ALEXA_ENDPOINTS[update.region],
		);
	}

	for (const [key, value] of [
		["client_id", update.clientId],
		["client_secret", update.clientSecret],
	] as const) {
		if (value === undefined) continue;
		if (value === null) {
			await setValue(key, null);
			continue;
		}
		const trimmed = value.trim();
		if (!trimmed || trimmed.length > 512 || /[\r\n]/.test(trimmed)) {
			throw new Error(`Invalid ${key}`);
		}
		const loc = await ws.locate([...SMART_HOME, key]);
		ensureParents(loc.doc, loc.path);
		await storeSecret(ws, loc, key, trimmed);
	}

	return { files: await ws.commit([secretsPath()]) };
}

/* ---------------------------------- publish ------------------------------- */

/**
 * Publishes the entity selection and per-entity Alexa config
 */
export async function updateAlexaConfiguration(
	entityIds: string[],
	entityConfig: Record<string, unknown> = {},
): Promise<{
	success: true;
	message: string;
	entitiesCount: number;
	files: string[];
	changed: boolean;
}> {
	if (!validateEntityIds(entityIds)) {
		throw new Error("Invalid entity ID format detected");
	}
	if (!validateEntityIds(Object.keys(entityConfig))) {
		throw new Error("Invalid entity ID format in entity config");
	}
	const changes = Object.fromEntries(
		Object.entries(entityConfig).map(([id, cfg]) => [
			id,
			normalizeEntityConfig(cfg),
		]),
	);

	const ws = new YamlWorkspace();
	const filter = await ws.locate(FILTER_PATH);
	setIncludeEntities(filter.doc, filter.path, entityIds);
	await applyEntityConfig(ws, changes);

	const files = await ws.commit();
	const count = new Set(entityIds).size;

	return {
		success: true,
		message: files.length
			? "Configuration updated successfully"
			: "No changes to publish",
		entitiesCount: count,
		files,
		changed: files.length > 0,
	};
}
