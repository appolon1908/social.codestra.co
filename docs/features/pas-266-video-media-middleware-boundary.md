# PAS-266 — Video media handoff through Middleware

Status: contract alignment  
Authority: PAS-266 — NABEEL-07 — Video post-production & publishing pipeline  
Base: `main@349cdaf7c376fbf72c838af29350af641c230841`

## Required topology

Codestra Video MUST NOT call Codestra Social directly.

```
Video Controller
  -> Middleware V3
  -> durable social media artifact registry
  -> governed Postiz/Codestra Social adapter
  -> Codestra Social private API
```

Middleware remains the only cross-system write boundary. Codestra Social owns
social-domain media state, drafts, approval state, schedules, provider account
metadata and OAuth-token custody.

## Video artifact flow

1. Video rendering completes on the media host.
2. The controller computes SHA-256 and registers the media reference with
   Middleware.
3. Middleware persists tenant-scoped artifact identity and audit evidence.
4. A separately authorized Middleware command may hand the media to Codestra
   Social through the existing media upload adapter.
5. Codestra Social creates/updates draft/social-domain state.
6. Publication remains a separate approval/effect command.

Registration alone never publishes, schedules, invokes a provider, or enables
callbacks.

## Social runtime safety

The media-host staging installation MUST retain:

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

The Social backend is private. Video Controller credentials or direct provider
credentials must not be installed in Codestra Social.

## Existing product API

The existing backend media routes and public Social publication contract remain
product-owned surfaces. No new Video-specific public endpoint is added here.
The new cross-system artifact registration API belongs to Middleware.

## Acceptance

- Direct Video -> Social path absent.
- Middleware media registration is durable, tenant-scoped and idempotent.
- Social provider delivery remains disabled by default.
- Social runtime is reachable only through a reviewed private Middleware
  adapter path before staging certification.
- No production provider effect is enabled.

LIVE_CAPABILITIES_ENABLED=NO  
PRODUCTION_DEPLOYED=NO
