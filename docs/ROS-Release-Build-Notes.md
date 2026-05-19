# ROS Release Build Notes

## Development Entitlement Bypass

Local development builds intentionally unlock all ROS features so product work is not blocked by commerce wiring.

Current dev bypass locations:

- Rust/Tauri: `src-tauri/src/license.rs`
  - `current_license()` returns a Developer license when compiled with `debug_assertions`.
  - This affects `npm run desktop:dev` / `cargo tauri dev`.
- Frontend/Vite: `src/utils/entitlements.js`
  - `normalizeLicenseState(null)` returns a Developer license when `import.meta.env.DEV` is true.
  - This affects `npm run dev` browser development.

The bypass presents as:

- tier: `developer`
- label: `Developer`
- status: `dev-bypass`
- features: `all_features`

## Public Release Checklist

Before any public release build:

1. Confirm release builds are compiled without `debug_assertions`.
2. Confirm `import.meta.env.DEV` is false in the packaged frontend build.
3. Launch the packaged app with no `license.json`.
4. Verify the unlock/control-room tier reads `Individual ROS`, not `Developer`.
5. Verify paid native commands still call `check_feature()` / `require_feature()`.
6. Verify a signed Founder/Pro/Enterprise/Developer key is required to unlock paid capabilities.

Do not ship a public build that reports `Developer`, `dev-bypass`, or `all_features` without a signed Developer license.

## Why This Exists

The bypass is for local implementation speed only. It must not replace signed offline licensing for public builds.
