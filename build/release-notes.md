# HedgeCon v0.1.2

This hotfix repairs a startup failure in v0.1.1 and includes the new built-in application update system.

## Hotfix

- Fixed a packaged-runtime import error that prevented HedgeCon v0.1.1 from opening.
- The updater now uses the CommonJS-compatible named export provided by `electron-updater`.

## What's new

- Automatic update checks against the public `Releah/HedgeCon` GitHub Releases feed.
- Manual **Check now** control under **Settings → Application updates**.
- User-approved update downloads with visible progress.
- Release notes displayed inside HedgeCon when provided with the update.
- **Restart and install** flow that preserves local sessions and settings.
- A warning before installation when SSH connections are active.
- Optional automatic checks, enabled by default and configurable in Settings.
- Portable builds link to the latest GitHub Release for manual replacement.
- Automated tagged-release workflow for the Windows installer, portable build and updater metadata.

## Upgrade note

Do not use v0.1.1; it cannot launch. Existing v0.1 and v0.1.1 users must install v0.1.2 manually because those builds cannot complete an in-app update. Once v0.1.2 is installed, later releases can be downloaded and installed from inside HedgeCon.

Windows packages are not yet code-signed, so Windows may display a security warning. Confirm that downloads came from the official `Releah/HedgeCon` repository before running them.
