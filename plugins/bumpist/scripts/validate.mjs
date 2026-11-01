#!/usr/bin/env node
// Validates Bumpist pipeline files against their contracts, with no dependencies.
//   state.json      → C4 state       (schemas/workspace/v0.json#/$defs/state)
//   data-model.json → C6 data model  (schemas/data/v0.json)
// Covers the JSON Schema subset the contracts use (type, required, properties, items, enum,
// pattern, minItems, minimum, additionalProperties, $ref, oneOf, date-time) plus checks a
// schema can't express: owner is one of the entity's fields, access roles exist, references resolve.
//
//   node validate.mjs <file>... [--approved <stage>]
// Prints a reason per problem and exits 1 if any file fails.
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const loadJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const WORKSPACE = loadJson(join(here, "../schemas/workspace/v0.json"));
const DATA = loadJson(join(here, "../schemas/data/v0.json"));
const DATE_TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/;

const typeOf = (v) =>
  Array.isArray(v) ? "array" : v === null ? "null" : Number.isInteger(v) ? "integer" : typeof v;
const at = (path) => path || "(root)";

function resolveRef(root, ref) {
  return ref.replace(/^#\//, "").split("/").reduce((node, key) => node[key], root);
}

function check(value, schema, root, path, errors) {
  if (schema.$ref) return check(value, resolveRef(root, schema.$ref), root, path, errors);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((s) => {
      const e = [];
      check(value, s, root, path, e);
      return e.length === 0;
    }).length;
    if (matches !== 1) errors.push(`${at(path)}: does not match any allowed form`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at(path)}: ${JSON.stringify(value)} is not one of ${schema.enum.join(", ")}`);
    return;
  }
  if (schema.type) {
    const t = typeOf(value);
    if (t !== schema.type && !(schema.type === "number" && t === "integer")) {
      errors.push(`${at(path)}: expected ${schema.type}, got ${t}`);
      return;
    }
  }
  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      errors.push(`${at(path)}: "${value}" does not match ${schema.pattern}`);
    if (schema.format === "date-time" && !DATE_TIME.test(value))
      errors.push(`${at(path)}: "${value}" is not an ISO 8601 date-time`);
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum)
    errors.push(`${at(path)}: ${value} is below the minimum ${schema.minimum}`);
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems)
      errors.push(`${at(path)}: needs at least ${schema.minItems} item(s)`);
    if (schema.items) value.forEach((v, i) => check(v, schema.items, root, `${path}[${i}]`, errors));
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required ?? [])
      if (!(key in value)) errors.push(`${at(path)}: missing required "${key}"`);
    for (const [key, v] of Object.entries(value)) {
      const sub = schema.properties?.[key] ?? (typeof schema.additionalProperties === "object" ? schema.additionalProperties : null);
      if (sub) check(v, sub, root, path ? `${path}.${key}` : key, errors);
    }
  }
}

function dataModelRules(model, errors) {
  if (model.$schema !== DATA.$id) errors.push(`$schema: must be "${DATA.$id}"`);
  const roles = new Set(model.roles ?? []);
  const entities = Array.isArray(model.entities) ? model.entities : [];
  const fieldsOf = new Map();
  for (const e of entities) {
    if (fieldsOf.has(e.name)) errors.push(`entities: "${e.name}" is defined more than once`);
    fieldsOf.set(e.name, new Set((e.fields ?? []).map((f) => f.name)));
  }
  entities.forEach((e, i) => {
    const where = `entities[${i}] (${e.name})`;
    const seen = new Set();
    for (const f of e.fields ?? []) {
      if (seen.has(f.name)) errors.push(`${where}.fields: "${f.name}" is defined more than once`);
      seen.add(f.name);
      if (f.type === "enum" && !(f.values?.length > 0))
        errors.push(`${where}.fields.${f.name}: enum field needs a non-empty "values" list`);
      if (f.references) {
        const [entity, field] = f.references.split(".");
        if (!fieldsOf.get(entity)?.has(field))
          errors.push(`${where}.fields.${f.name}: references "${f.references}", which is not an existing entity.field`);
      }
    }
    if (e.owner !== undefined && !seen.has(e.owner))
      errors.push(`${where}.owner: "${e.owner}" is not one of the entity's fields`);
    for (const role of Object.keys(e.access ?? {}))
      if (!roles.has(role)) errors.push(`${where}.access: role "${role}" is not listed in roles`);
  });
}

const KINDS = {
  "state.json": {
    label: "C4 state",
    validate(doc, errors) {
      check(doc, WORKSPACE.$defs.state, WORKSPACE, "", errors);
    },
  },
  "data-model.json": {
    label: "C6 data model",
    validate(doc, errors) {
      check(doc, DATA, DATA, "", errors);
      dataModelRules(doc, errors);
    },
  },
};

const args = process.argv.slice(2);
const flag = args.indexOf("--approved");
const approved = flag >= 0 ? args.splice(flag, 2)[1] : null;
if (args.length === 0) {
  console.error("usage: node validate.mjs <state.json | data-model.json>... [--approved <stage>]");
  process.exit(2);
}

let failed = 0;
for (const file of args) {
  const kind = KINDS[basename(file)];
  const errors = [];
  let doc;
  if (!kind) errors.push("unknown file: expected state.json or data-model.json");
  else if (!existsSync(file)) errors.push("file not found");
  else {
    try {
      doc = loadJson(file);
    } catch (e) {
      errors.push(`invalid JSON (${e.message})`);
    }
  }
  if (doc !== undefined) {
    kind.validate(doc, errors);
    if (approved && basename(file) === "state.json" && !(doc.approvals ?? []).some((a) => a?.stage === approved))
      errors.push(`approvals: no approval for stage "${approved}"`);
  }
  const label = kind ? ` (${kind.label})` : "";
  if (errors.length) {
    failed++;
    console.log(`✗ ${file}${label}`);
    for (const e of errors) console.log(`  - ${e}`);
  } else console.log(`✓ ${file}${label}`);
}
process.exit(failed ? 1 : 0);
