---
name: spec
description: Stage 2 of the Bumpist pipeline. Turn an approved .bumpist/brief.md into .bumpist/prd.md (user flows, prioritised features, draft screens, data, non-functional needs, events, open questions) and .bumpist/data-model.json (C6 data and permissions). Use when the user runs /bumpist:spec or asks to plan a service whose brief is approved.
---

# Bumpist stage 2 — spec

You turn the approved brief into a product spec and a data model. Stage 3 designs screens from them and stage 4 builds the database from the data model, so both must follow their contracts exactly.

All paths are relative to the service folder, the one that holds `.bumpist/`. The validator ships with this plugin:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate.mjs" <file>... [--approved <stage>]
```

It prints a reason for every problem and exits non-zero when a file fails.

## Before you start

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate.mjs" .bumpist/state.json --approved brief`.
   If it fails (no state file, an invalid one, or no approval for `brief`), stop and tell the user why. The brief has to be approved with `/bumpist:brief` first.
2. If `stage` in `.bumpist/state.json` is already `spec` or a later stage, tell the user and stop unless they ask to redo the spec.
3. Read `.bumpist/brief.md`. Ask only when the spec can't be written without the answer: at most three questions, numbered, in one message. Everything else goes to `## Open questions`.

## Write .bumpist/prd.md

Use these English headings exactly, in this order. Write the body in the brief's language.

1. `## User flows`: at most three core flows, each as numbered steps.
2. `## Features`: four lists, `Must`, `Should`, `Could` and `Won't`. Must is what the brief's single job needs to work. `Won't` carries every item of the brief's `## Out of scope`.
3. `## Screens (draft)`: one line per screen, its name and purpose. Stage 3 settles the list.
4. `## Data`: a short summary of the entities and who owns them. The details live in `data-model.json`.
5. `## Non-functional`: performance, accessibility, permissions and security, privacy.
6. `## Events`: the events needed to measure every success metric in the brief, each tied to the hypothesis it measures.
7. `## Open questions`: decisions a person has to make.

## Write .bumpist/data-model.json (C6)

- `$schema` is `https://parksubeom.github.io/bumpist-agents/schemas/data/v0.json`.
- `tenancy` is `user` when each person owns their data, `team` when a team does.
- `roles` come from the user types in the brief's `## Target user`, in snake_case.
- Every entity has an `owner`: the name of one of its own fields that holds the owning user or team id.
- `access` gives each role only the actions its flows need, on rows the actor owns or belongs to.
- Add `public` only when a flow needs anonymous access, and say why in `## Data`.
- Names are snake_case. Field types come from the C6 list, `enum` fields carry `values`, and `references` point to `entity.field`.

Then validate both files and fix every reported problem until it passes:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate.mjs" .bumpist/state.json .bumpist/data-model.json
```

## Human check

1. Show a short summary: the flows, the Must features, each entity with its owner and role access, and the open questions. Ask the user to approve or edit.
2. Don't change `stage` before the user approves.
3. On approval, update `.bumpist/state.json`: append `{ "stage": "spec", "by": "<approver>", "at": "<ISO time>" }` to `approvals`, set `stage` to `"spec"` and set `updatedAt`. `by` is the approver's name or handle; if you don't know it, ask for it together with the approval question. Run the validator on `.bumpist/state.json` again.
4. Don't start stage 3.

## Rules

- No invented facts about users, the market or numbers. What the brief doesn't support becomes an open question or is marked as an assumption.
- Keep `prd.md` short enough to review in one sitting.
