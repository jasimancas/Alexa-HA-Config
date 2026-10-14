import fs from "node:fs/promises";
import path from "node:path";
import {
	type Document,
	isMap,
	isScalar,
	isSeq,
	parseDocument,
	type ScalarTag,
} from "yaml";

const HA_DIR = () => `${process.env.HA_CONF_PATH ?? "/"}homeassistant`;
const CONFIG_PATH = () => path.join(HA_DIR(), "configuration.yaml");
const BACKUP_DIR = () => path.join(HA_DIR(), ".alexa_ha_config_backups");
export const MAX_BACKUPS = 10;

/** Path inside the YAML tree where Alexa reads the exposed entities */
const FILTER_PATH = ["alexa", "smart_home", "filter", "include_entities"];

/**
 * Home Assistant custom tags. They are kept as tagged scalars so the
 * document round-trips byte-for-byte except for the nodes we touch.
 */
const HA_TAGS: ScalarTag[] = [
	"!include",
	"!secret",
	"!env_var",
	"!input",
	"!include_dir_list",
	"!include_dir_named",
	"!include_dir_merge_list",
	"!include_dir_merge_named",
].map((tag) => ({ tag, resolve: (value: string) => value }));

/**
 * Parses YAML preserving comments, formatting and HA custom tags
 */
export function parseYAML(content: string): Document {
	const doc = parseDocument(content, { customTags: HA_TAGS });
	if (doc.errors.length > 0) {
		throw new Error(`Failed to parse YAML: ${doc.errors[0].message}`);
	}
	return doc;
}

export function stringifyYAML(doc: Document): string {
	return doc.toString({ lineWidth: 0 });
}

async function readFile(file: string): Promise<string> {
	try {
		return await fs.readFile(file, "utf-8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(`Configuration file not found at ${file}`);
		}
		throw new Error(
			`Failed to read configuration file: ${(error as Error).message}`,
		);
	}
}

/**
 * Resolves an `!include` target, refusing anything outside the HA config dir
 */
function resolveInclude(fromFile: string, target: string): string {
	const resolved = path.resolve(path.dirname(fromFile), target);
	const root = path.resolve(HA_DIR());
	if (!resolved.startsWith(`${root}${path.sep}`)) {
		throw new Error(`Refusing to follow !include outside config: ${target}`);
	}
	return resolved;
}

type Location = { file: string; doc: Document; path: string[] };

/**
 * Finds the file and YAML path holding `include_entities`, following
 * `!include` directives (e.g. `alexa: !include alexa.yaml`).
 */
export async function locateFilter(): Promise<Location> {
	let file = CONFIG_PATH();
	let doc = parseYAML(await readFile(file));
	let remaining = [...FILTER_PATH];

	for (let i = 0; i < remaining.length; i++) {
		const node = doc.getIn(remaining.slice(0, i + 1), true);
		if (isScalar(node) && node.tag === "!include") {
			file = resolveInclude(file, String(node.value));
			doc = parseYAML(await readFile(file));
			remaining = remaining.slice(i + 1);
			i = -1;
			continue;
		}
		if (isScalar(node) && node.tag?.startsWith("!")) {
			throw new Error(
				`Unsupported ${node.tag} at ${remaining.slice(0, i + 1).join(".")}; only !include can be followed`,
			);
		}
		if (node === undefined || (isScalar(node) && node.value === null)) {
			break;
		}
	}

	return { file, doc, path: remaining };
}

/**
 * Reads the entity IDs currently exposed to Alexa
 */
export async function getSharedEntityIds(): Promise<string[]> {
	const { doc, path: p } = await locateFilter();
	const value = p.length === 0 ? doc.toJS() : doc.getIn(p);
	if (!value) return [];
	const list = isSeq(value) ? value.toJSON() : value;
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
			doc.contents = doc.createNode(wanted);
		} else {
			if (doc.contents === null || isScalar(doc.contents)) {
				doc.contents = doc.createNode({});
			}
			// Empty intermediate keys (`alexa:` with no value) parse as null scalars
			for (let i = 1; i < yamlPath.length; i++) {
				const node = doc.getIn(yamlPath.slice(0, i), true);
				if (node === undefined || isMap(node)) continue;
				if (isScalar(node) && node.value === null) {
					doc.setIn(yamlPath.slice(0, i), doc.createNode({}));
				} else {
					throw new Error(
						`Unexpected value at ${yamlPath.slice(0, i).join(".")}; expected a mapping`,
					);
				}
			}
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

/**
 * Validates entity ID format (domain.object_id)
 */
export function validateEntityIds(entityIds: unknown[]): boolean {
	const entityIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
	return entityIds.every(
		(id) => typeof id === "string" && entityIdPattern.test(id),
	);
}

/**
 * Copies the file into a timestamped backup and prunes old ones
 */
export async function createBackup(file: string): Promise<string> {
	try {
		const dir = BACKUP_DIR();
		await fs.mkdir(dir, { recursive: true });
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		const target = path.join(dir, `${path.basename(file)}.${stamp}.bak`);
		await fs.copyFile(file, target);

		const backups = (await fs.readdir(dir)).filter((f) => f.endsWith(".bak"));
		backups.sort();
		for (const old of backups.slice(
			0,
			Math.max(0, backups.length - MAX_BACKUPS),
		)) {
			await fs.unlink(path.join(dir, old));
		}
		return target;
	} catch (error) {
		throw new Error(`Failed to create backup: ${(error as Error).message}`);
	}
}

/**
 * Writes atomically (temp file + rename) so HA never sees a half-written file
 */
export async function writeFileAtomic(
	file: string,
	content: string,
): Promise<void> {
	const tmp = `${file}.alexa_ha_config.tmp`;
	try {
		await fs.writeFile(tmp, content, "utf-8");
		await fs.rename(tmp, file);
	} catch (error) {
		await fs.rm(tmp, { force: true }).catch(() => undefined);
		if ((error as NodeJS.ErrnoException).code === "EACCES") {
			throw new Error("Permission denied writing to configuration file");
		}
		throw new Error(
			`Failed to write configuration file: ${(error as Error).message}`,
		);
	}
}

/**
 * Main function to update Alexa configuration
 */
export async function updateAlexaConfiguration(entityIds: string[]): Promise<{
	success: true;
	message: string;
	entitiesCount: number;
	file: string;
	changed: boolean;
}> {
	if (!validateEntityIds(entityIds)) {
		throw new Error("Invalid entity ID format detected");
	}

	const { file, doc, path: yamlPath } = await locateFilter();
	const before = stringifyYAML(doc);
	setIncludeEntities(doc, yamlPath, entityIds);
	const after = stringifyYAML(doc);
	const count = new Set(entityIds).size;

	if (before === after) {
		return {
			success: true,
			message: "No changes to publish",
			entitiesCount: count,
			file,
			changed: false,
		};
	}

	// Make sure we still produce a valid document before touching disk
	parseYAML(after);
	await createBackup(file);
	await writeFileAtomic(file, after);

	return {
		success: true,
		message: "Configuration updated successfully",
		entitiesCount: count,
		file,
		changed: true,
	};
}
