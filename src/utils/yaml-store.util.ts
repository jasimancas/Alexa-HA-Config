import fs from "node:fs/promises";
import path from "node:path";
import {
	type Document,
	isMap,
	isScalar,
	type Node,
	parseDocument,
	type ScalarTag,
} from "yaml";

export const haDir = () => `${process.env.HA_CONF_PATH ?? "/"}homeassistant`;
export const configPath = () => path.join(haDir(), "configuration.yaml");
export const secretsPath = () => path.join(haDir(), "secrets.yaml");
const backupDir = () => path.join(haDir(), ".alexa_ha_config_backups");
export const MAX_BACKUPS = 10;

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
	const root = path.resolve(haDir());
	if (!resolved.startsWith(`${root}${path.sep}`)) {
		throw new Error(`Refusing to follow !include outside config: ${target}`);
	}
	return resolved;
}

/**
 * Copies the file into a timestamped backup and prunes old ones
 */
export async function createBackup(file: string): Promise<string> {
	try {
		const dir = backupDir();
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
	mode?: number,
): Promise<void> {
	const tmp = `${file}.alexa_ha_config.tmp`;
	try {
		await fs.writeFile(tmp, content, { encoding: "utf-8", mode });
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

export type Location = { file: string; doc: Document; path: string[] };

/** Returns the node at a location (the document root for an empty path) */
export function nodeAt(loc: Location): unknown {
	return loc.path.length === 0
		? loc.doc.contents
		: loc.doc.getIn(loc.path, true);
}

/**
 * Makes every parent of `yamlPath` a mapping so `setIn` can write to it.
 * Empty keys (`alexa:` with no value) are turned into mappings; any other
 * scalar is refused rather than overwritten.
 */
export function ensureParents(doc: Document, yamlPath: string[]): void {
	if (doc.contents === null || isScalar(doc.contents)) {
		if (isScalar(doc.contents) && doc.contents.value !== null) {
			throw new Error("Unexpected document content; expected a mapping");
		}
		doc.contents = doc.createNode({}) as Node as typeof doc.contents;
	}
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
}

/**
 * Loads YAML files on demand, follows `!include` and writes back only the
 * files that changed (each with a backup, atomically).
 */
export class YamlWorkspace {
	private files = new Map<string, { doc: Document; original: string | null }>();

	/** Loads (once) a file. Optional files that don't exist start empty. */
	async load(file: string, optional = false): Promise<Document> {
		const cached = this.files.get(file);
		if (cached) return cached.doc;

		let original: string | null;
		try {
			original = await readFile(file);
		} catch (error) {
			if (!optional || !(error as Error).message.includes("not found")) {
				throw error;
			}
			original = null;
		}
		const doc = parseYAML(original ?? "");
		this.files.set(file, { doc, original });
		return doc;
	}

	/**
	 * Finds the file and YAML path for `yamlPath` (rooted at
	 * configuration.yaml), following `!include` directives on the way.
	 */
	async locate(yamlPath: string[]): Promise<Location> {
		let file = configPath();
		let doc = await this.load(file);
		let remaining = [...yamlPath];

		for (let i = 0; i < remaining.length; i++) {
			const node = doc.getIn(remaining.slice(0, i + 1), true);
			if (isScalar(node) && node.tag === "!include") {
				file = resolveInclude(file, String(node.value));
				doc = await this.load(file);
				remaining = remaining.slice(i + 1);
				i = -1;
				continue;
			}
			if (isScalar(node) && node.tag?.startsWith("!")) {
				// e.g. a `!secret` leaf: the location itself is still valid
				if (i === remaining.length - 1) break;
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

	/** Files whose content differs from what was loaded */
	changedFiles(): string[] {
		return [...this.files.entries()]
			.filter(
				([, { doc, original }]) => stringifyYAML(doc) !== (original ?? ""),
			)
			.map(([file]) => file);
	}

	/**
	 * Writes changed files. `first` files are written before the rest (e.g.
	 * secrets.yaml before the config that references it).
	 */
	async commit(first: string[] = []): Promise<string[]> {
		const changed = this.changedFiles().sort(
			(a, b) => Number(first.includes(b)) - Number(first.includes(a)),
		);

		// Validate everything before touching disk
		const outputs = changed.map((file) => {
			const content = stringifyYAML(this.files.get(file)?.doc as Document);
			parseYAML(content);
			return { file, content };
		});

		for (const { file, content } of outputs) {
			const entry = this.files.get(file);
			if (entry?.original !== null) {
				await createBackup(file);
			}
			// New secrets.yaml should not be world-readable
			const mode = entry?.original === null ? 0o600 : undefined;
			await writeFileAtomic(file, content, mode);
			if (entry) entry.original = content;
		}
		return changed;
	}
}
