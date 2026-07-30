# HedgeCon v0.1

HedgeCon is a modern, self-contained SSH and network-operations workspace for Windows. This first public release establishes the foundations for managing devices, working across several live terminals, transferring files, monitoring reachability, and keeping operational knowledge in Git.

> **Early release:** v0.1 is suitable for testing and feedback, but should not yet be treated as a replacement for established production tooling. Please keep independent backups of important data and device configurations.

## Highlights

- Save SSH connections in an unrestricted hierarchy of nested folders.
- Search sessions and reorganise them using drag and drop.
- Open multiple SSH sessions in tabs.
- Split terminals horizontally or vertically, add multiple panes, drag sessions to snap them, and resize pane dividers.
- Automatically reconnect when an SSH session drops.
- Use password authentication, private keys, or reusable credential sets.
- Generate, import, install, inspect, and remove SSH public keys.
- Verify SSH host keys and clear saved fingerprints following legitimate device replacement.
- Upload and download files using SFTP or SCP.
- Monitor ping latency and see when a host went offline and recovered.
- Select terminal text to copy it and right-click to paste.

## Inventory and documentation

- Manage sessions through the graphical interface or the optional modern YAML editor.
- Import Ansible-style inventories containing groups, nested groups, hosts, and variables.
- Store inventory in a local workspace or a Git-backed repository.
- Maintain a searchable Markdown Wiki containing general notes, per-session notes, and vendor cheat sheets.
- Work with local Git repositories or HTTPS remotes such as GitHub and Gitea.
- Commit, pull, push, and see whether the Wiki is current, ahead, behind, or diverged.
- Empty remote repositories now clearly request an initial commit before status tracking begins.

## Security and privacy

- Fresh installations contain no personal sessions, credentials, SSH keys, host fingerprints, or repository configuration.
- Saved passwords, passphrases, and Git access tokens use operating-system-backed encryption.
- Secrets and private keys are excluded from YAML inventory and the source repository.
- SSH host keys are verified and changed fingerprints require explicit approval.
- Electron renderer sandboxing and context isolation are enabled.
- A **Reset all local data** action is available before testing, sharing screenshots, or uninstalling.

## Installation

Download **`HedgeCon-Setup.exe`** from the Assets section below and run it. The installer creates Start Menu and desktop shortcuts and does not require Node.js, Electron, pnpm, or other development dependencies.

Alternatively, download **`HedgeCon.exe`** to run the portable Windows build without installation.

Windows may display a warning because this early build is not yet code-signed. Verify that the file came from this repository before running it.

## Known limitations

- Automated device-configuration collection and versioned configuration backups are not implemented yet.
- Guided vendor workflows such as **Add VLAN** are planned for a later release.
- Device-specific Cisco, Juniper, Arista, and other network operating-system drivers remain future work.
- Git conflict resolution and SSH-based Git remotes are not yet supported; pulls are fast-forward-only.
- Remote SSH-key installation currently targets POSIX-style shells and network devices rather than native Windows OpenSSH layouts.
- Linux is an intended target, but v0.1 release assets currently focus on Windows unless an AppImage is attached separately.
- The Windows binaries are not yet code-signed.

## Feedback

This is the first public development release. Bug reports, usability feedback, and feature suggestions are welcome through GitHub Issues.

