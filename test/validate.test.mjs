// Tests for plugins/bumpist/scripts/validate.mjs. Run with: node --test test/validate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VALIDATE = "plugins/bumpist/scripts/validate.mjs";

function run(files, extra = []) {
  const dir = mkdtempSync(join(tmpdir(), "bumpist-validate-"));
  const paths = Object.entries(files).map(([name, doc]) => {
    const p = join(dir, name);
    writeFileSync(p, typeof doc === "string" ? doc : JSON.stringify(doc));
    return p;
  });
  const r = spawnSync(process.execPath, [VALIDATE, ...paths, ...extra], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

const state = {
  $schema: "https://parksubeom.github.io/bumpist-agents/schemas/workspace/v0.json#/$defs/state",
  stage: "brief",
  approvals: [{ stage: "brief", by: "someone", at: "2026-11-01T12:00:00Z" }],
  updatedAt: "2026-11-01T12:00:00Z",
};

const dataModel = {
  $schema: "https://parksubeom.github.io/bumpist-agents/schemas/data/v0.json",
  tenancy: "team",
  roles: ["owner", "reviewer"],
  entities: [
    {
      name: "workspace",
      fields: [{ name: "id", type: "uuid", required: true }],
      owner: "id",
      access: { owner: ["read", "update"], reviewer: ["read"] },
    },
    {
      name: "request",
      fields: [
        { name: "id", type: "uuid", required: true },
        { name: "workspace_id", type: "uuid", required: true, references: "workspace.id" },
        { name: "status", type: "enum", values: ["pending", "approved"] },
      ],
      owner: "workspace_id",
      access: { owner: ["read", "update"], reviewer: ["read", "update"] },
    },
  ],
};

test("valid state and data model pass", () => {
  const r = run({ "state.json": state, "data-model.json": dataModel }, ["--approved", "brief"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /✓ .*state\.json \(C4 state\)/);
  assert.match(r.out, /✓ .*data-model\.json \(C6 data model\)/);
});

test("state errors are reported per item", () => {
  const bad = { stage: "planning", approvals: [{ stage: "brief", at: "yesterday" }], updatedAt: "2026-11-01" };
  const r = run({ "state.json": bad });
  assert.equal(r.code, 1);
  assert.match(r.out, /stage: "planning" is not one of brief, spec/);
  assert.match(r.out, /approvals\[0\]: missing required "by"/);
  assert.match(r.out, /approvals\[0\]\.at: "yesterday" is not an ISO 8601 date-time/);
  assert.match(r.out, /updatedAt: "2026-11-01" is not an ISO 8601 date-time/);
});

test("--approved fails when the stage has no approval", () => {
  const r = run({ "state.json": { ...state, approvals: [] } }, ["--approved", "brief"]);
  assert.equal(r.code, 1);
  assert.match(r.out, /no approval for stage "brief"/);
});

test("data model rules a schema can't express", () => {
  const bad = structuredClone(dataModel);
  bad.entities[1].owner = "author_id";
  bad.entities[1].access.admin = ["read"];
  bad.entities[1].fields[1].references = "team.id";
  bad.entities[1].fields[2].values = [];
  const r = run({ "data-model.json": bad });
  assert.equal(r.code, 1);
  assert.match(r.out, /request\)\.owner: "author_id" is not one of the entity's fields/);
  assert.match(r.out, /role "admin" is not listed in roles/);
  assert.match(r.out, /references "team\.id", which is not an existing entity\.field/);
  assert.match(r.out, /status: enum field needs a non-empty "values" list/);
});

test("data model schema errors are reported", () => {
  const bad = { ...structuredClone(dataModel), tenancy: "org", roles: [] };
  delete bad.entities[0].owner;
  bad.entities[0].fields[0].type = "string";
  const r = run({ "data-model.json": bad });
  assert.equal(r.code, 1);
  assert.match(r.out, /tenancy: "org" is not one of user, team/);
  assert.match(r.out, /roles: needs at least 1 item/);
  assert.match(r.out, /entities\[0\]: missing required "owner"/);
  assert.match(r.out, /entities\[0\]\.fields\[0\]\.type: "string" is not one of/);
});

test("unknown file names and invalid JSON fail", () => {
  assert.match(run({ "brief.json": {} }).out, /unknown file/);
  assert.match(run({ "state.json": "{ not json" }).out, /invalid JSON/);
});

test("plugin schema copies match the published schemas", () => {
  for (const name of ["workspace", "data"]) {
    assert.deepEqual(
      JSON.parse(readFileSync(`plugins/bumpist/schemas/${name}/v0.json`, "utf8")),
      JSON.parse(readFileSync(`schemas/${name}/v0.json`, "utf8")),
      `plugins/bumpist/schemas/${name}/v0.json drifted from schemas/${name}/v0.json`,
    );
  }
});
