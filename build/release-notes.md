# HedgeCon v0.1.3

This release improves application shutdown and reorganises Settings into focused sections.

## What's new

- Added a right-side Settings tab rail for General, Credentials, SSH keys, Git, Updates and Privacy.
- Added editable Git repository settings for the remote URL, commit identity, username and encrypted access token.
- Added clear feedback when no Wiki/Git repository has been configured yet.
- Added single-instance protection so opening HedgeCon again focuses the existing window instead of creating another process group.
- SSH streams, client sockets and ping subprocesses are now force-closed during normal exit and update installation.
- Update installation now performs runtime cleanup before starting the silent installer.

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

Users on v0.1.2 can install this release through **Settings → Updates**. Users on v0.1 or the broken v0.1.1 release must install v0.1.3 manually.

Windows packages are not yet code-signed, so Windows may display a security warning. Confirm that downloads came from the official `Releah/HedgeCon` repository before running them.
