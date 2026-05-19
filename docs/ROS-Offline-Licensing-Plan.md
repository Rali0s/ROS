# ROS Offline Licensing and Entitlements

## Product Rule

ROS stays local-first. Licensing must not require telemetry or a runtime cloud auth check for normal use. The desktop app validates a signed license key locally, then maps the claims to feature flags.

## License Location

- Store `license.json` beside the encrypted workspace data, outside the encrypted vault.
- This lets splash and unlock screens show the current tier before the workspace is decrypted.
- The license file does not contain workspace memory, notes, commands, or vault contents.

## Tier Model

- **Individual ROS**: local cockpit, encrypted workspace, manual memory capture, basic search, core modules, Command Memory Console.
- **Founder Edition**: Pro-equivalent early-access license, founder badge, full v2 cockpit, local model workflow, private roadmap label.
- **Pro ROS**: unlimited projects, full module access, model workspace, Security Model v1 workflow shell, advanced backup/export, F*Society LAN.
- **Enterprise ROS**: Pro plus linked ROS nodes, organization panel, controller/node teaming, fleet/team policy surfaces, Enterprise branding.
- **Developer**: internal all-features tier issued as a signed Developer license. Production builds do not unlock features through environment variables.
- **Development bypass**: debug/native dev builds and Vite dev mode may present a temporary Developer entitlement for local implementation work only. See `docs/ROS-Release-Build-Notes.md`; public releases must verify this is inactive.

## Commerce Contract

1. User chooses a tier on the site.
2. Stripe Checkout handles payment.
3. Stripe Customer Portal handles upgrade, downgrade, cancel, and payment method changes.
4. A Railway webhook bridge receives Stripe events.
5. The bridge maps Stripe price IDs to ROS tiers/features.
6. Keygen issues a signed short-expiry key.
7. Resend or Postmark emails the key to the customer.
8. User pastes the key into Control Room.
9. Tauri/Rust validates the signature locally using the baked-in public key.

Lemon Squeezy remains a future merchant-of-record option, not the first integration path.

## Revocation Strategy

v1 uses short-expiry signed keys:

- Renewals issue a fresh key through the Stripe webhook flow.
- ROS remains offline-capable until the signed expiry time.
- Expired or invalid keys fall back to Individual ROS without touching encrypted workspace data.
- The app shows expiry warnings before paid features expire.

## Native Enforcement

Rust owns the source of truth:

- `get_license_state()`
- `install_license_key(key)`
- `remove_license()`
- `check_feature(feature_id)`

Native commands that expose paid functionality must check entitlements before execution. Frontend gates are presentation only.

## Key Format

Production Keygen signed-key format:

```text
key/<base64url(payload_json)>.<base64url(ed25519_signature)>
```

The signature is verified over the `key/<base64url(payload_json)>` signing string.

Development fallback token format:

```text
ros1.<base64url(payload_json)>.<base64url(ed25519_signature)>
```

The development fallback signature is verified over the raw decoded JSON payload bytes. Replace the scaffold public key with the production Keygen public key before release.
