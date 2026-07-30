# HedgeCon v0.1.1

This release adds built-in application updates for installed Windows builds.

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

Existing v0.1 users must install v0.1.1 manually because their current build does not contain the updater. Once v0.1.1 is installed, later releases can be downloaded and installed from inside HedgeCon.

Windows packages are not yet code-signed, so Windows may display a security warning. Confirm that downloads came from the official `Releah/HedgeCon` repository before running them.

