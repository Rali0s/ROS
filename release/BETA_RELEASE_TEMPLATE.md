# ROS Beta Release Template

## Release identity
- Product: OSA Midnight Oil / ROS Beta
- Channel: waitlist-beta
- Version: 1.2.0-beta.1
- Runtime: native desktop via Tauri

## Artifacts
- macOS: `.dmg`
- Windows: installer package
- Linux: `.AppImage`
- Linux: distro package when generated cleanly

## Naming convention
- `osa-midnight-oil_<version>_macos_<arch>.dmg`
- `osa-midnight-oil_<version>_windows_<arch>_setup.exe`
- `osa-midnight-oil_<version>_linux_<arch>.AppImage`
- `osa-midnight-oil_<version>_linux_<arch>.deb`

## Release notes structure
1. What changed in the beta
2. Trust and recovery notes
3. Platform-specific install guidance
4. Known limitations
5. Checksums

## Publish path
1. Run lint and desktop build verification.
2. Build platform artifacts.
3. Run `npm run release:checksums`.
4. Review `release/BETA_RELEASE_NOTES.generated.md`.
5. Upload bundles and `release/CHECKSUMS.txt` to GitHub Releases or the chosen direct-download host.
