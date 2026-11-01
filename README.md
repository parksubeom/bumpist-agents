# bumpist-agents

A Claude Code plugin marketplace with the **Bumpist pipeline**: from a one-line idea to a Vercel preview pull request, in stages you can also run one by one. Part of the Bumpist Suite; works with any design system that publishes a C2 catalog.

> **Status: v0 (phase 0).** Stage 1 `/bumpist:brief` and contracts C4 (workspace) and C6 (data and permissions) are here. Stages 2–4 arrive in phase 1, 5–9 in phase 2.

## Install

```
/plugin marketplace add parksubeom/bumpist-agents
/plugin install bumpist@bumpist-agents
/bumpist:brief
```

## Contracts

| Contract | File in a service repo | Schema |
| --- | --- | --- |
| C4 Workspace | `.bumpist/state.json`, `screens.json`, `tasks.json`, `metrics.json` | [`schemas/workspace/v0.json`](https://parksubeom.github.io/bumpist-agents/schemas/workspace/v0.json) |
| C6 Data and permissions | `.bumpist/data-model.json` | [`schemas/data/v0.json`](https://parksubeom.github.io/bumpist-agents/schemas/data/v0.json) |

[한국어 README](./README.ko.md) · MIT
