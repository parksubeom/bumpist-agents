---
name: brief
description: Stage 1 of the Bumpist pipeline. Interview the user about a one-line product idea and write .bumpist/brief.md with the target user, the problem, hypotheses to test, success metrics and what is out of scope. Use when the user runs /bumpist:brief or starts a new service with the Bumpist pipeline.
---

# Bumpist stage 1 — brief

You turn a one-line idea into `.bumpist/brief.md`. Later stages refuse to start without it, so it must be complete and honest.

## Steps

1. If `.bumpist/state.json` exists and `stage` is past `brief`, tell the user and stop unless they ask to redo it.
2. Ask at most five questions, one message, numbered. Skip anything the idea already answers:
   - Who uses it, and in what moment of their day?
   - What do they do today instead, and what hurts about it?
   - What is the single job the first version must do well?
   - How will we know in two weeks after launch that it worked? (one or two numbers)
   - What will the first version deliberately not do?
3. Write `.bumpist/brief.md` with exactly these headings, in this order:
   `## Target user`, `## Problem`, `## Hypotheses` (each one falsifiable, numbered H1…), `## Success metrics` (each tied to a hypothesis, with a target and a time window), `## Out of scope`.
4. Write or update `.bumpist/state.json` to `{ "$schema": "https://parksubeom.github.io/bumpist-agents/schemas/workspace/v0.json#/$defs/state", "stage": "brief", "approvals": [], "updatedAt": "<ISO time>" }`.
5. Show the brief and ask the user to approve or edit it. Do not start stage 2.

## Rules

- No invented facts about the market or users. If the user does not know, write it as a hypothesis.
- Metrics must be measurable with sign-up, activation and return events (the ops kit's defaults) unless the user names others.
- Keep the brief under one page.
