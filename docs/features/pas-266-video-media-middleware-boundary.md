# PAS-266 — Video media handoff through Middleware

Status: implementation candidate  
Authority: PAS-266 — NABEEL-07 — Video post-production & publishing pipeline  
Base: `main@349cdaf7c376fbf72c838af29350af641c230841`

## Required topology

Codestra Video MUST NOT call Codestra Social directly.

```
Video Controller
  -> Middleware V3 media registry
  -> Middleware Social adapter
  -> Codestra Social /internal/v1/social/media
```

Middleware remains the only cross-system write boundary. Codestra Social owns
social-domain media state, drafts, approval state, schedules, provider-account
metadata and OAuth-token custody.

## Middleware handoff

Middleware PR #416 adds:

- `POST /api/v1/social/media`
- `GET /api/v1/social/media/{asset_id}`

Registration is tenant-bound, checksum-bound and idempotent and does not invoke a
Social provider.

## Codestra Social private API

This PR adds service-auth-only operations:

- `POST /internal/v1/social/media` — requires `social.media.write`,
  `X-Tenant-ID`, `X-Correlation-ID`, mTLS verification, and
  `Idempotency-Key`.
- `GET /internal/v1/social/media/{assetId}` — requires
  `social.media.read` plus the same tenant/service trust boundary.

A dedicated `SocialMediaArtifact` model stores Middleware's asset UUID,
tenant, idempotency/payload hashes, media/content type, storage reference,
SHA-256, safe metadata, correlation ID and registering service.

Identical replay returns the existing artifact. A changed replay returns
`idempotency_payload_conflict`.

The private media registration endpoint does not upload bytes to a provider,
create a post, schedule a post, or publish anything. Binary transfer and
publication remain separate Middleware-authorized effects.

## Migration

Forward migration:
`20261003000100_video_media_artifacts`.

It creates only the additive `SocialMediaArtifact` table, indexes, uniqueness
for tenant idempotency and the tenant foreign key. Rollback is forward-fix or
application rollback; no destructive production down migration is introduced.

## Runtime safety

The media-host staging installation retains:

```
SOCIAL_PUBLISHING_ENABLED=false
ENABLE_EXTERNAL_DELIVERY=false
PUBLISHING_KILL_SWITCH=true
SOCIAL_PROVIDER_CALLBACKS_ENABLED=false
MIDDLEWARE_OUTBOX_ENABLED=false
WEBHOOK_DELIVERY_ENABLED=false
BILLING_LIVE_CHARGE=false
EXTERNAL_MODEL_CALLS_ENABLED=false
```

Service auth remains fail-closed until Keycloak service identity and private mTLS
transport are provisioned.

## Acceptance

- Direct Video -> Social path absent.
- Video Controller fails closed when Middleware identity is unavailable.
- Middleware media registration is durable, tenant-scoped and idempotent.
- Social private media registration is service-auth/mTLS protected and
  tenant-scoped.
- Provider delivery remains disabled by registration.
- Social runtime is private and no public/provider effect is activated.

LIVE_CAPABILITIES_ENABLED=NO  
PRODUCTION_DEPLOYED=NO
