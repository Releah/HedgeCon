<div align="center">
  <img src="public/hedgecon-logo.png" alt="HedgeCon logo" width="96">

  # HedgeCon

  **Your network sessions, tools and notes in one workspace.**

  A modern, self-contained SSH workspace built for network engineers and systems administrators.
</div>

---

HedgeCon started with a simple frustration: connecting to equipment is only one part of the job. The terminal, inventory, file transfers, reachability checks, credentials and notes all tend to live in different places.

The long-term goal is a single practical workspace for operating network infrastructure. Version 0.1 establishes that foundation with a capable SSH client, structured inventory, Git-backed documentation and the everyday tools needed alongside a terminal.

> **Project status:** HedgeCon is in early development. The current build is ready for testing and feedback, but it should not yet replace established production tooling. Keep independent backups of important data and device configurations.

## What is included today

### SSH workspace

- Saved SSH sessions organised into folders with unrestricted nested subfolders.
- Search across session names, hosts and usernames.
- Drag-and-drop session organisation.
- Password, private-key and reusable credential-set authentication.
- Optional operating-system-encrypted storage for passwords and key passphrases.
- SSH host-key verification, changed-key warnings and trusted-key removal.
- Automatic reconnection when a live session drops.
- A responsive xterm terminal with bounded scrollback.
- Select-to-copy and right-click paste.

### Tabs and split terminals

- Run several SSH and device-browser sessions at the same time using tabs.
- Split the workspace horizontally or vertically.
- Drag a tab to an edge to snap it into a pane.
- Add more than two sessions to a split layout.
- Resize panes by dragging their dividers.
- Close an individual pane and let the remaining sessions reclaim the space.

### Tools alongside the terminal

- Resizable Ping or SSH-port TCP monitor with response-time history, outage duration and selectable Live, 5m, 30m, 1h, 4h and Max ranges.
- SFTP remote file browser with uploads and downloads.
- SCP uploads and downloads for hosts where SFTP is unavailable or unsuitable.
- Resize the remote file browser and notes panel without interrupting the terminal.
- SSH key generation, import, discovery and fingerprint display.
- Install and remove public keys in a remote `authorized_keys` file.
- Open session notes beside the terminal and resize the notes panel while you work.

### Inventory and Git-backed knowledge

- Optional CodeMirror-based YAML inventory editor.
- Import Ansible-style `all`, `children`, `hosts` and `vars` structures.
- Preview and validate YAML before it replaces the graphical inventory.
- Store inventory locally or in a Git-backed workspace.
- Markdown Wiki for general notes, per-session notes and vendor cheat sheets.
- Organise General and Vendor notes into nested folders, drag pages between them, collapse sections and resize the Wiki tree.
- Search page titles and Markdown content across General, Vendor and Session notes.
- Local Git repositories and HTTPS remotes including GitHub, Gitea and compatible servers.
- Commit, pull, merge and guarded push from inside HedgeCon, with an editor for same-file conflicts.
- At-a-glance repository state: current, ahead, behind, diverged, local-only or awaiting its first commit.
- Share neutral credential-profile names in inventory while every user maps them to private local credentials.

### Device web interfaces

- Add an optional HTTP or HTTPS management address to any saved session.
- Open SSH and Web tabs independently from the same session card.
- Navigate device interfaces with Back, Forward, Reload and an editable address bar.
- Keep cookies in an isolated local partition for each device address.
- Confirm untrusted device certificates explicitly and clearly identify insecure HTTP connections.
- Open the current page in the system browser when a device is incompatible with embedded Chromium.

## Installing HedgeCon

### Windows installer

Download `HedgeCon-Setup.exe` from the latest GitHub Release and run it. The installer:

- Installs HedgeCon for the current user.
- Offers a choice of installation directory.
- Creates Start Menu and desktop shortcuts.
- Adds HedgeCon to Windows Installed Apps for upgrades and removal.
- Includes the application runtime and dependencies.

The current x64 installer download is approximately 93 MiB and uses approximately 350 MiB after installation. Exact sizes may vary slightly between releases. Node.js, pnpm and Electron do not need to be installed separately.

Windows may warn when opening the current build because it is not yet code-signed. Confirm that the installer came from this repository before running it.

### Code signing policy

Windows release signing is being prepared through SignPath. **Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).**

- Committer and reviewer: [@Releah](https://github.com/Releah)
- Signing approver: [@Releah](https://github.com/Releah)
- Source and release builds: [Releah/HedgeCon](https://github.com/Releah/HedgeCon)

HedgeCon does not include advertising or telemetry. It communicates with networked systems only to perform a user-configured or user-initiated operation: SSH connections and monitoring, device-browser navigation, Git repository operations, opening external release links, and update checks against the public HedgeCon GitHub release feed. Automatic update checks can be disabled in **Settings → Application updates**. Credentials, private keys, terminal contents, session data and Wiki contents are not sent to HedgeCon or SignPath. See [Code signing and release process](docs/code-signing.md) for the complete release policy and verification procedure.

### Updates

Installed builds check the public `Releah/HedgeCon` GitHub Releases feed after startup. Open **Settings → Application updates** to check manually, disable automatic checks, download an available release or restart to install one. HedgeCon never silently closes active SSH sessions: installing an update requires confirmation and warns when connections are open.

The portable edition reports new releases but cannot replace its own executable. Use its **Open GitHub Release** button to download the new portable build manually.

### Portable Windows build

`HedgeCon.exe` is the portable edition. Download it from the GitHub Release and run it directly without an installation wizard. The current portable executable is approximately 93 MiB.

### Linux

Linux x64 is distributed as an AppImage and is built alongside the Windows packages for tagged releases. Kali Linux is supported as a Debian-family test target; release testing is still welcome across different desktop environments and keyring configurations.

## First run

A fresh installation contains no sessions, credentials, SSH keys, host fingerprints or repository settings. HedgeCon asks how you want to manage inventory:

- **Local workspace** keeps folders and sessions on that computer.
- **Local Git repository** creates or opens a repository containing the inventory and Wiki structure.
- **Shared Git server** clones an HTTPS GitHub, Gitea or compatible repository and reads its inventory file.

Git-managed inventory contains connection metadata such as folders, hosts, ports, usernames and credential-set references. Passwords, passphrases, private keys, access tokens and trusted host fingerprints remain local to the computer.

## Everyday use

### Create an SSH session

1. Select **New session**.
2. Enter a name, hostname or IP address, port and folder.
3. Choose session-specific credentials or a reusable credential set.
4. Select password or private-key authentication.
5. Optionally add an HTTP or HTTPS device-management address.
6. Save the session and select **SSH**.
7. Check the server fingerprint before trusting a new host.

If a password credential does not have a saved password, HedgeCon prompts for one before attempting authentication. A blank saved password is not sent automatically.

### Organise sessions

- Select **New folder** to create a top-level folder or a child of the selected folder.
- Click a parent folder to collapse or expand its contents.
- Drag a session card onto a folder to move it.
- Open **All sessions** to search the complete inventory.
- Double-click a session card to connect quickly.

### Reusable credentials

Open **Settings → Credential sets** to create authentication details shared by several sessions. Updating a credential set updates every linked session.

Passwords and private-key passphrases are optional. When saved, they are encrypted using Electron's operating-system-backed secure storage rather than being written into the inventory.

### SSH keys

Open **Settings → SSH keys** to generate an RSA-3072 key pair, import an existing key, discover keys in the user's `.ssh` folder, copy a public key or delete a HedgeCon-managed key.

When assigning a key to a session, choose the **private key**—the file without the `.pub` suffix.

While connected using an existing authentication method, select **Keys** beneath the terminal. HedgeCon compares local public keys with the remote `~/.ssh/authorized_keys` file, then offers the keys available to install or remove. Remote key management currently targets POSIX-style shells and network devices.

### Split sessions

Open several SSH or Web sessions to create tabs. Use the split controls to arrange them horizontally or vertically, or drag a tab toward an edge of the workspace to snap it into a new pane. Drag the divider to change how much room each pane receives.

### Open a device web interface

Edit a session and enter its complete management address, including `http://` or `https://` and any non-standard port or path. The session card then shows separate **SSH** and **Web** controls.

Web pages run in a sandboxed Chromium view without Node.js, filesystem or HedgeCon API access. Browser permissions are denied and popup requests remain in the device tab. Each device address has separate persistent cookies. HedgeCon warns before loading plain HTTP and asks for explicit confirmation before temporarily accepting an untrusted certificate. Verify certificate fingerprints independently; never accept a warning merely because the device is expected to use a self-signed certificate.

### Monitor reachability

Select **Monitor** beneath a connected terminal, then choose ICMP Ping or a TCP connection check against the session's SSH port. HedgeCon graphs response times, marks outages and reports how long the target remained unavailable. Drag the monitor's upper edge to resize it and choose Live, 5m, 30m, 1h, 4h or Max history. Samples and terminal scrollback are bounded so leaving the application running does not cause unlimited memory growth.

### Transfer files

Select **Files** beneath a terminal to open the remote filesystem browser. Choose SFTP or SCP, navigate the remote host, then upload or download a file. Availability depends on the SSH server and the connected account's permissions.

## YAML inventory

Select **Inventory YAML** in the sidebar to open the optional editor.

- **Reset from GUI** generates YAML from the current folders and sessions.
- **Open YAML** loads an existing `.yml` or `.yaml` inventory.
- **Validate & preview** reports the folders, sessions and warnings that would result.
- **Apply inventory** replaces the graphical inventory after confirmation.
- Git-managed workspaces can load the inventory from Git or commit and push an update.

Ansible groups become HedgeCon folders. A small example:

```yaml
all:
  children:
    linux:
      hosts:
        docker-01:
          ansible_host: 192.0.2.10
          ansible_port: 22
          hedgecon_credential_profile: network-admin
          hedgecon_web_url: https://192.0.2.10
```

Inventory is deliberately not a secret store. Plaintext fields such as `ansible_password`, `ansible_ssh_pass` and passphrases are rejected. Use `hedgecon_credential_profile` to share a neutral role that each user maps to one of their locally stored credential sets. `hedgecon_web_url` shares the device-management address but never browser cookies or credentials.

## Wiki and session notes

Select **Wiki** in the sidebar to work with general operational notes, session-specific pages and searchable vendor cheat sheets.

The Wiki can use a normal local Git repository or clone an HTTPS remote. For a private GitHub or Gitea repository, enter your Git username and a personal access token. The token is encrypted by the operating system and is never stored in the repository. On Linux, HedgeCon refuses to save or decrypt secrets if Electron falls back to the insecure `basic_text` backend; start a supported system keyring such as GNOME Keyring/libsecret or leave the token blank and authenticate another way.

Saving a page writes it locally; it does not publish silently. Review the changed-file count, enter a commit message, select **Commit**, then **Push**. Before pushing, HedgeCon fetches the server history, merges compatible concurrent changes and opens an explicit resolution editor when both users changed the same file.

Select **Notes** beneath a live terminal to open that session's page alongside the CLI. The SSH connection and active monitors continue running while notes are edited.

## Data and security

- Electron context isolation and renderer sandboxing are enabled.
- Unexpected navigation, popup windows and renderer permission requests are denied.
- Device pages run in isolated sandboxed browser processes without Node.js or HedgeCon API access.
- Device-browser permissions are denied, credentials in URLs are rejected, and certificate exceptions require confirmation.
- SSH host fingerprints are checked against locally trusted values.
- Saved secrets use operating-system-backed encryption.
- Private keys and secrets are excluded from inventory YAML and the source repository.
- Input, terminal scrollback, file sizes and monitoring history are bounded.
- Git synchronisation checks remote history before pushing and requires explicit resolution of same-file conflicts.
- Packaged binaries are currently unsigned development builds.

Application data is stored in the operating system's HedgeCon application-data directory, not inside the source or installation folder. Uninstalling does not automatically delete sessions, credentials, managed keys or repository settings.

To return HedgeCon to a blank state, open **Settings → Reset all local data**. This removes the HedgeCon workspace, encrypted secrets, known-host fingerprints, managed SSH keys and repository settings, then restarts the application. External Wiki repositories and keys in the user's normal `.ssh` directory are not deleted.

## Roadmap

The next stages move HedgeCon beyond terminal management and toward the wider network-operations goal:

- Collect device configurations and maintain versioned history and diffs.
- Push configuration history to a shared Git server.
- Add vendor-aware drivers for Cisco, Juniper, Arista and other platforms.
- Build guided changes such as **Add VLAN**, with preview and validation before commands are applied.
- Add device-specific paging, configuration-mode, commit and rollback handling.
- Add native Windows OpenSSH key management and agent integration.
- Introduce broader automated tests, signed packages and crash recovery.

## Development

HedgeCon uses Electron, React, TypeScript, xterm.js, ssh2, CodeMirror and isomorphic-git.

Requirements:

- Node.js
- pnpm

Install dependencies and start development mode:

```powershell
pnpm install
pnpm dev
```

Type-check and build the application:

```powershell
pnpm build
```

Create the portable Windows executable:

```powershell
pnpm package:win
```

Create the Windows installer:

```powershell
pnpm package:win:installer
```

Create a Linux AppImage from Linux:

```bash
pnpm package:linux
```

Generated applications are written to `release/`. That directory is intentionally excluded from Git; publish binaries as GitHub Release assets instead of committing them to the source repository.

Tagged releases are built by `.github/workflows/release.yml`. The Git tag must match the version in `package.json`—for example, package version `0.1.5` uses tag `v0.1.5`. The workflow publishes the Windows installer and portable executable, Linux x64 AppImage, blockmaps and updater metadata to GitHub Releases. No GitHub token is stored in the application.

## Repository hygiene

The repository excludes dependency folders, compiled output, local Wiki repositories, application data, exported inventories, environment files, private keys and release binaries.

Before publishing a change, check what Git will include:

```powershell
git status
```

Never add passwords, access tokens, private keys or real production inventories to a commit.

## Contributing

HedgeCon is at the point where real-world testing is especially valuable. Bug reports, device-specific edge cases and focused pull requests are welcome. When reporting an SSH or Git problem, remove hostnames, usernames, addresses, tokens and key material from logs and screenshots first.

Please use GitHub Issues for bugs and feature requests.

## Release notes

See [HedgeCon v0.1 release notes](RELEASE_NOTES_v0.1.md).
