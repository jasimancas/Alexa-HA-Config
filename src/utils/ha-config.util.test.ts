import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createBackup,
	getSharedEntityIds,
	MAX_BACKUPS,
	parseYAML,
	setIncludeEntities,
	stringifyYAML,
	updateAlexaConfiguration,
	validateEntityIds,
} from "./ha-config.util";

let root: string;
let haDir: string;
const configFile = () => path.join(haDir, "configuration.yaml");
const write = (name: string, content: string) =>
	fs.writeFile(path.join(haDir, name), content, "utf-8");
const read = (name = "configuration.yaml") =>
	fs.readFile(path.join(haDir, name), "utf-8");

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "alexa-ha-config-"));
	haDir = path.join(root, "homeassistant");
	await fs.mkdir(haDir);
	process.env.HA_CONF_PATH = `${root}/`;
});

afterEach(async () => {
	delete process.env.HA_CONF_PATH;
	await fs.rm(root, { recursive: true, force: true });
});

describe("parseYAML / stringifyYAML", () => {
	it("round-trips comments, blank lines and HA tags untouched", () => {
		const src = `# Main config
default_config:

homeassistant:
  name: Home # inline
  customize: !include customize.yaml
api_password: !secret pw
automation: !include_dir_merge_list automations/
`;
		expect(stringifyYAML(parseYAML(src))).toBe(src);
	});

	it("throws on invalid YAML", () => {
		expect(() => parseYAML("a: [1, 2")).toThrow(/Failed to parse YAML/);
	});
});

describe("setIncludeEntities", () => {
	const filterPath = ["alexa", "smart_home", "filter", "include_entities"];

	it("creates the alexa section when missing", () => {
		const doc = parseYAML("homeassistant:\n  name: x\n");
		setIncludeEntities(doc, filterPath, ["switch.b", "light.a"]);
		expect(doc.toJS().alexa.smart_home.filter.include_entities).toEqual([
			"light.a",
			"switch.b",
		]);
	});

	it("fills empty intermediate keys", () => {
		const doc = parseYAML("alexa:\n");
		setIncludeEntities(doc, filterPath, ["light.a"]);
		expect(doc.toJS().alexa.smart_home.filter.include_entities).toEqual([
			"light.a",
		]);
	});

	it("refuses to overwrite a non-mapping value", () => {
		const doc = parseYAML("alexa: something\n");
		expect(() => setIncludeEntities(doc, filterPath, ["light.a"])).toThrow(
			/expected a mapping/,
		);
	});

	it("keeps comments of entities that stay selected", () => {
		const doc = parseYAML(`alexa:
  smart_home:
    filter:
      include_entities:
        - light.a # kitchen
        - switch.b
`);
		setIncludeEntities(doc, filterPath, ["light.a", "light.c"]);
		const out = stringifyYAML(doc);
		expect(out).toContain("- light.a # kitchen");
		expect(out).toContain("- light.c");
		expect(out).not.toContain("switch.b");
	});

	it("deduplicates entity ids", () => {
		const doc = parseYAML("");
		setIncludeEntities(doc, filterPath, ["light.a", "light.a"]);
		expect(doc.toJS().alexa.smart_home.filter.include_entities).toEqual([
			"light.a",
		]);
	});
});

describe("validateEntityIds", () => {
	it.each([
		[["light.a", "sensor.temp_1", "switch.123"], true],
		[["light"], false],
		[["Light.A"], false],
		[["light.a b"], false],
		[["light.a\n- evil.x"], false],
		[[42], false],
	])("%j -> %s", (ids, expected) => {
		expect(validateEntityIds(ids)).toBe(expected);
	});
});

describe("getSharedEntityIds", () => {
	it("returns [] when there is no alexa section", async () => {
		await write("configuration.yaml", "homeassistant:\n");
		expect(await getSharedEntityIds()).toEqual([]);
	});

	it("reads include_entities", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    filter:\n      include_entities: [light.a, switch.b]\n",
		);
		expect(await getSharedEntityIds()).toEqual(["light.a", "switch.b"]);
	});

	it("follows !include", async () => {
		await write("configuration.yaml", "alexa: !include alexa.yaml\n");
		await write(
			"alexa.yaml",
			"smart_home:\n  filter:\n    include_entities:\n      - light.a\n",
		);
		expect(await getSharedEntityIds()).toEqual(["light.a"]);
	});

	it("follows !include pointing at the list itself", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    filter:\n      include_entities: !include alexa_entities.yaml\n",
		);
		await write("alexa_entities.yaml", "- light.a\n- light.b\n");
		expect(await getSharedEntityIds()).toEqual(["light.a", "light.b"]);
	});

	it("refuses includes outside the config dir", async () => {
		await write("configuration.yaml", "alexa: !include ../../etc/passwd\n");
		await expect(getSharedEntityIds()).rejects.toThrow(/outside config/);
	});

	it("fails clearly when configuration.yaml is missing", async () => {
		await expect(getSharedEntityIds()).rejects.toThrow(
			/Configuration file not found/,
		);
	});
});

describe("updateAlexaConfiguration", () => {
	const original = `# My config
homeassistant:
  name: Home # keep me
  customize: !include customize.yaml

alexa:
  smart_home:
    locale: es-ES
    filter:
      include_entities:
        - light.a
`;

	it("only changes the entity list and keeps the rest of the file", async () => {
		await write("configuration.yaml", original);
		const result = await updateAlexaConfiguration(["light.a", "switch.b"]);

		expect(result).toMatchObject({
			success: true,
			entitiesCount: 2,
			changed: true,
		});
		expect(await read()).toBe(
			original.replace(
				"        - light.a\n",
				"        - light.a\n        - switch.b\n",
			),
		);
	});

	it("writes into the included file", async () => {
		await write("configuration.yaml", "alexa: !include alexa.yaml\n");
		await write("alexa.yaml", "smart_home:\n  locale: en-US\n");
		const result = await updateAlexaConfiguration(["light.a"]);

		expect(result.file).toBe(path.join(haDir, "alexa.yaml"));
		expect(await read()).toBe("alexa: !include alexa.yaml\n");
		expect(parseYAML(await read("alexa.yaml")).toJS()).toEqual({
			smart_home: {
				locale: "en-US",
				filter: { include_entities: ["light.a"] },
			},
		});
	});

	it("does not write or back up when nothing changed", async () => {
		await write("configuration.yaml", original);
		const result = await updateAlexaConfiguration(["light.a"]);

		expect(result.changed).toBe(false);
		await expect(
			fs.readdir(path.join(haDir, ".alexa_ha_config_backups")),
		).rejects.toThrow();
	});

	it("creates a backup with the previous content", async () => {
		await write("configuration.yaml", original);
		await updateAlexaConfiguration(["switch.b"]);

		const dir = path.join(haDir, ".alexa_ha_config_backups");
		const [backup] = await fs.readdir(dir);
		expect(await fs.readFile(path.join(dir, backup), "utf-8")).toBe(original);
	});

	it("rejects invalid entity ids without touching the file", async () => {
		await write("configuration.yaml", original);
		await expect(updateAlexaConfiguration(["bad id"])).rejects.toThrow(
			/Invalid entity ID/,
		);
		expect(await read()).toBe(original);
	});

	it("leaves no temp file behind", async () => {
		await write("configuration.yaml", original);
		await updateAlexaConfiguration(["switch.b"]);
		expect(await fs.readdir(haDir)).toEqual(
			expect.not.arrayContaining([expect.stringMatching(/\.tmp$/)]),
		);
	});
});

describe("createBackup", () => {
	it(`keeps only the last ${MAX_BACKUPS} backups`, async () => {
		await write("configuration.yaml", "a: 1\n");
		const dir = path.join(haDir, ".alexa_ha_config_backups");
		await fs.mkdir(dir);
		for (let i = 0; i < MAX_BACKUPS + 3; i++) {
			await fs.writeFile(
				path.join(dir, `configuration.yaml.2020-01-${String(i + 10)}.bak`),
				"old",
			);
		}
		await createBackup(configFile());
		const files = await fs.readdir(dir);
		expect(files).toHaveLength(MAX_BACKUPS);
		expect(files.some((f) => f.startsWith("configuration.yaml.20"))).toBe(true);
		expect(files).not.toContain("configuration.yaml.2020-01-10.bak");
	});
});
