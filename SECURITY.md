# Security Policy

OSA Midnight Oil is a local-first desktop workspace. Please treat reports involving secrets, encryption, vault behavior, local data exposure, update integrity, or unsafe network behavior as security-sensitive.

## Reporting

Use GitHub Security Advisories when available. If advisories are not enabled, open a public issue only with a high-level description and avoid posting secrets, exploit payloads, private logs, or user data.

## Supported Scope

Security review currently focuses on:

- encrypted workspace storage and unlock/lock behavior
- local-only model and vault workflows
- native desktop boundaries in Tauri/Rust
- release artifact integrity and checksums
- defensive network features that require user action

## Public Disclosure

Please allow maintainers time to investigate and prepare a fix before broad disclosure. Reports should include affected versions, reproduction steps, expected impact, and whether any user data or private material may be exposed.
