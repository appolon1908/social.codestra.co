# Repository agent instructions

All backend and orchestrator work MUST follow
[`docs/architecture/CODESTRA_SOCIAL_BACKEND_ARCHITECTURE_AND_DEVELOPMENT_RULES.md`](docs/architecture/CODESTRA_SOCIAL_BACKEND_ARCHITECTURE_AND_DEVELOPMENT_RULES.md).

That standard is binding. In particular: branch from current green `main`, target
`main`, use contract-first APIs/events, preserve tenant isolation and durable
idempotency, run forward migrations separately, keep every live capability
disabled, and never push directly to `main` or merge your own pull request.

<!-- CODESTRA_AGENT_PROTOCOL_V1 -->
## Codestra continuation contract

Canonical protocol:
https://github.com/ingtrader21-spec/codestra/blob/main/docs/AGENT-CONTINUATION-PROTOCOL.md

Quick start:
https://github.com/ingtrader21-spec/codestra/blob/main/docs/AGENT-QUICKSTART.md

Before changing code:
1. Read `.codestra-mission/*` when present.
2. Read the active Linear issue and linked Notion architecture.
3. Inspect exact Git branch/HEAD/dirty/worktree/upstream/PR/CI state.
4. Preserve all existing local work.
5. If acting as Builder, verify exclusive issue ownership and use a dedicated worktree.
6. Do not invent or self-assign the next task.
7. Update GitHub + Linear + Notion + the mission checkpoint before handoff.
8. Do not cross the live-production approval boundary.

The canonical protocol's no-loss, one-writer, protected-merge, checkpoint, and production-boundary rules are mandatory.
