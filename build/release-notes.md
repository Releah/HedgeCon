# HedgeCon v0.1.4

This hotfix restores generated SSH keys to the SSH key manager and connection editors.

## Fixed

- Keys generated with a custom filename now appear immediately after generation.
- HedgeCon-managed keys are no longer hidden by the conservative filename filter used when discovering keys in the user's `.ssh` folder.
- Added a manual refresh route by reopening the SSH keys page.

Existing keys are not lost and do not need to be regenerated; upgrading and opening the SSH keys page will make them visible again.
