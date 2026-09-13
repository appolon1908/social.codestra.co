# Social publish idempotency, read-back, and staging

Status: **client and staging preparation complete; server endpoint/runtime certification pending**.

## Outcome and authority

Codestra Social owns publication intent and provider state. Middleware remains the only cross-system write boundary. The runtime client now carries a stable client reference as its idempotency key, correlation identity, tenant-bound bearer authentication, a content fingerprint, direct lookup by client reference, normalized lifecycle state, account identity, runtime/provider IDs, and timestamps.

The client rejects publication unless both its control-plane enablement and the runtime kill-switch state were explicitly supplied as open. All repository and staging defaults remain disabled.

## Operations

- `POST /v2/social/publications` — create a publication using `Idempotency-Key == clientReference`.
- `GET /v2/social/publications/{runtimePostId}` — read authoritative state.
- `GET /v2/social/publications/by-client-reference/{clientReference}` — recover after an interrupted response without a second POST.
- `GET /v2/social/publications/{runtimePostId}/metrics` — tenant-bound metrics.

Same key and same normalized payload returns the original result. Same key with a different payload returns HTTP 409 and `IDEMPOTENCY_CONFLICT`. Unknown outcomes are read back; they are never blindly retried.

## Staging

`deploy/staging/compose.yaml` runs the exact immutable application digest with PostgreSQL and Redis on an internal network. Prometheus and Grafana are internal and expose no host ports. Caddy is the only public listener on 80/443. Secrets are root-owned files rendered from OpenBao; no secret values belong in Git.

Required certification uses a sandbox provider account and proves first acceptance, identical replay, changed-payload conflict, concurrent replay, interrupted-response read-back, tenant/account denial, scheduling validation, state transitions, restart recovery, queue recovery, provider timeout reconciliation, metrics, alerts, dashboards, and cleanup. Record exact source SHA, image digest, correlation ID, redacted hashes, timestamps, and PASS/FAIL.

## Governance blockers

Issue #32 requires a GitHub administrator to bind branch protection to the exact check names in `governance/release-policy.json`; code cannot manufacture classic statuses or mutate protected rules. Issue #28 requires a real second eligible human reviewer. Neither control may be bypassed or self-approved.

## Migration and remaining server work

No schema migration is included in this preparation change. The server-side publication ledger, unique tenant/client-reference constraint, transactional outbox, callback inbox, and provider reconciliation worker must land in a separate forward-migration backend PR before issue #46 can close. Until then Middleware must treat ambiguous outcomes as non-retryable and require operator reconciliation.

`LIVE_CAPABILITIES_ENABLED=NO`  
`LIVE_SERVER_CHANGED=NO`  
`PRODUCTION_DEPLOYED=NO`
