import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createBackup,
	getSharedEntityIds,
	MAX_BACKUPS,
	migrateSecrets,
	normalizeEntityConfig,
	parseYAML,
	readAlexaConfig,
	setIncludeEntities,
	stringifyYAML,
	updateAlexaConfiguration,
	updateAlexaSettings,
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

		expect(result.files).toEqual([path.join(haDir, "alexa.yaml")]);
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

describe("entity_config", () => {
	const base = `alexa:
  smart_home:
    filter:
      include_entities:
        - light.a
    entity_config:
      light.a:
        name: Old name # spoken name
        description: keep me
      switch: # domain-level entry
        display_categories: SWITCH
`;

	it("updates fields in place keeping comments and other entries", async () => {
		await write("configuration.yaml", base);
		await updateAlexaConfiguration(["light.a"], {
			"light.a": { name: "Salón", description: "keep me" },
		});
		const out = await read();
		expect(out).toContain("name: Salón # spoken name");
		expect(out).toContain("# domain-level entry");
		expect(out).toContain("display_categories: SWITCH");
		expect(out).toContain("description: keep me");
	});

	it("removes empty fields and empty entries", async () => {
		await write("configuration.yaml", base);
		await updateAlexaConfiguration(["light.a"], {
			"light.a": { name: "", description: "" },
		});
		expect(
			parseYAML(await read()).toJS().alexa.smart_home.entity_config,
		).toEqual({
			switch: { display_categories: "SWITCH" },
		});
	});

	it("creates entity_config when missing", async () => {
		await write("configuration.yaml", "homeassistant:\n");
		await updateAlexaConfiguration(["light.b"], {
			"light.b": { name: "Cocina", display_categories: "light, smartplug" },
		});
		const cfg = parseYAML(await read()).toJS().alexa.smart_home;
		expect(cfg.entity_config["light.b"]).toEqual({
			name: "Cocina",
			display_categories: "LIGHT,SMARTPLUG",
		});
		expect(cfg.filter.include_entities).toEqual(["light.b"]);
	});

	it("reads entity_config back", async () => {
		await write("configuration.yaml", base);
		const cfg = await readAlexaConfig();
		expect(cfg.entityConfig["light.a"]).toEqual({
			name: "Old name",
			description: "keep me",
		});
	});

	it.each([
		[{ display_categories: "NOT_A_CATEGORY" }, /Unknown display category/],
		[{ name: "a\nb" }, /single line/],
		[{ name: "x".repeat(129) }, /max 128/],
		[{ name: 42 }, /expected text/],
	])("rejects invalid config %j", (cfg, error) => {
		expect(() => normalizeEntityConfig(cfg)).toThrow(error);
	});

	it("rejects invalid entity ids in entity config", async () => {
		await write("configuration.yaml", base);
		await expect(
			updateAlexaConfiguration(["light.a"], { "bad id": { name: "x" } }),
		).rejects.toThrow(/entity config/);
		expect(await read()).toBe(base);
	});
});

describe("settings and secrets", () => {
	it("reports plain-text credentials without exposing values", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    locale: es-ES\n    endpoint: https://api.eu.amazonalexa.com/v3/events\n    client_id: amzn1.abc\n    client_secret: !secret alexa_secret\n",
		);
		const cfg = await readAlexaConfig();
		expect(cfg.locale).toBe("es-ES");
		expect(cfg.region).toBe("eu");
		expect(cfg.proactiveEvents).toBe(true);
		expect(cfg.secrets).toEqual([
			{
				key: "client_id",
				path: "alexa.smart_home.client_id",
				state: "plaintext",
			},
			{
				key: "client_secret",
				path: "alexa.smart_home.client_secret",
				state: "secret",
			},
		]);
		expect(JSON.stringify(cfg)).not.toContain("amzn1.abc");
	});

	it("reports missing credentials", async () => {
		await write("configuration.yaml", "alexa:\n  smart_home:\n");
		const cfg = await readAlexaConfig();
		expect(cfg.secrets.map((s) => [s.key, s.state])).toEqual([
			["client_id", "missing"],
			["client_secret", "missing"],
		]);
		expect(cfg.proactiveEvents).toBe(false);
	});

	it("migrates plain-text credentials to secrets.yaml", async () => {
		await write(
			"configuration.yaml",
			"# cfg\nalexa:\n  smart_home:\n    client_id: amzn1.abc # from skill\n    client_secret: s3cr3t\n",
		);
		await write("secrets.yaml", "# my secrets\ndb_password: x\n");

		const result = await migrateSecrets();

		expect(result.migrated).toEqual(["client_id", "client_secret"]);
		const cfg = await read();
		expect(cfg).toContain("client_id: !secret alexa_client_id # from skill");
		expect(cfg).toContain("client_secret: !secret alexa_client_secret");
		expect(cfg).not.toContain("s3cr3t");
		const secrets = await read("secrets.yaml");
		expect(secrets).toContain("# my secrets");
		expect(parseYAML(secrets).toJS()).toEqual({
			db_password: "x",
			alexa_client_id: "amzn1.abc",
			alexa_client_secret: "s3cr3t",
		});
		expect(
			(await readAlexaConfig()).secrets.every((s) => s.state === "secret"),
		).toBe(true);
	});

	it("creates secrets.yaml with private permissions when missing", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    client_id: abc\n",
		);
		await migrateSecrets();
		const stat = await fs.stat(path.join(haDir, "secrets.yaml"));
		expect(stat.mode & 0o777).toBe(0o600);
	});

	it("never overwrites a different secret with the same name", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    client_id: new\n",
		);
		await write("secrets.yaml", "alexa_client_id: old\n");
		await migrateSecrets();
		expect(parseYAML(await read("secrets.yaml")).toJS()).toEqual({
			alexa_client_id: "old",
			alexa_client_id_2: "new",
		});
		expect(await read()).toContain("!secret alexa_client_id_2");
	});

	it("follows !include when migrating", async () => {
		await write("configuration.yaml", "alexa: !include alexa.yaml\n");
		await write("alexa.yaml", "smart_home:\n  client_secret: s3cr3t\n");
		await migrateSecrets();
		expect(await read()).toBe("alexa: !include alexa.yaml\n");
		expect(await read("alexa.yaml")).toContain(
			"client_secret: !secret alexa_client_secret",
		);
	});

	it("does nothing when everything is already secret", async () => {
		const cfg = "alexa:\n  smart_home:\n    client_id: !secret a\n";
		await write("configuration.yaml", cfg);
		const result = await migrateSecrets();
		expect(result).toEqual({ migrated: [], files: [] });
		expect(await read()).toBe(cfg);
	});

	it("updates locale, region and credentials (always as !secret)", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    locale: en-US # lang\n",
		);
		await updateAlexaSettings({
			locale: "es-ES",
			region: "eu",
			clientId: "amzn1.id",
			clientSecret: "shh",
		});
		const cfg = await read();
		expect(cfg).toContain("locale: es-ES # lang");
		expect(cfg).toContain("endpoint: https://api.eu.amazonalexa.com/v3/events");
		expect(cfg).toContain("client_id: !secret alexa_client_id");
		expect(cfg).not.toContain("shh");
		expect(parseYAML(await read("secrets.yaml")).toJS()).toEqual({
			alexa_client_id: "amzn1.id",
			alexa_client_secret: "shh",
		});
	});

	it("reuses the secret name the config already points to", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    client_id: !secret my_alexa_id\n",
		);
		await write("secrets.yaml", "my_alexa_id: old\n");
		await updateAlexaSettings({ clientId: "new" });
		expect(await read()).toContain("client_id: !secret my_alexa_id");
		expect(parseYAML(await read("secrets.yaml")).toJS()).toEqual({
			my_alexa_id: "new",
		});
	});

	it("clears locale and region", async () => {
		await write(
			"configuration.yaml",
			"alexa:\n  smart_home:\n    locale: es-ES\n    endpoint: https://api.eu.amazonalexa.com/v3/events\n",
		);
		await updateAlexaSettings({ locale: null, region: null });
		expect(parseYAML(await read()).toJS()).toEqual({
			alexa: { smart_home: {} },
		});
	});

	it.each([
		[{ locale: "xx-XX" }, /Unsupported locale/],
		[{ region: "mars" }, /Unsupported region/],
		[{ clientId: "  " }, /Invalid client_id/],
	])("rejects %j", async (update, error) => {
		await write("configuration.yaml", "alexa:\n");
		await expect(
			updateAlexaSettings(update as Parameters<typeof updateAlexaSettings>[0]),
		).rejects.toThrow(error);
	});
});
