# HedgeCon v0.1.5

This release adds the first published Linux x64 package and hardens secret storage on Linux desktops without a usable system keyring.

## Linux and Kali

- Added a Linux x64 AppImage to tagged GitHub releases.
- Added Linux updater metadata alongside the Windows release files.
- Kali Linux and other Debian-family x64 desktops can run the AppImage without installing Node.js or project dependencies.

## Security

- HedgeCon now checks Electron's selected Linux storage backend as well as `isEncryptionAvailable()`.
- The insecure `basic_text` fallback is rejected for new passwords, private-key passphrases, and Git access tokens.
- Secrets already written with that backend are not silently decrypted or used.
- Settings → Privacy now reports the selected secret-storage backend and whether it is considered secure.

When a Linux keyring is unavailable, SSH remains usable with per-connection prompts and unencrypted private keys. To persist secrets, start a supported desktop keyring such as GNOME Keyring/libsecret or KWallet and restart HedgeCon.
