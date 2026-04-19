# ROS Beta Smoke Checklist

## Trust / Setup
- Unlocks into the native vault successfully.
- Overview shows the correct beta channel and version.
- Control Room can export a support bundle.
- Snapshot export completes and a dry-run restore validation passes.

## Core Apps
- Vault Notes opens, edits, and persists.
- Library can open a reader without panel bleed.
- Wallet Vault reveal/hide works and long keys wrap cleanly.
- Research Vault opens and renders.

## Nostr Lounge
- Generate or import an identity.
- Save a profile and confirm posting unlocks.
- Refresh the feed and confirm relay diagnostics update.
- Verify wallet mirroring creates or refreshes a `Nostr` wallet entry.
- Export an identity bundle.

## Packaging
- App launches from the built bundle.
- Version and beta wording match the release notes.
- Checksums are generated for shipped artifacts.
