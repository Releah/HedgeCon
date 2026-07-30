# HedgeCon

HedgeCon is a modern, self-contained connectivity console for network engineers and systems administrators. It currently focuses on SSH access and inventory management while providing the foundations for configuration backup, version control, and guided network automation.

The application is designed for Windows and Linux. Packaged builds contain the runtime and application dependencies; users do not need Node.js, pnpm, or Electron installed.

## Repository hygiene

The source repository intentionally excludes dependencies, compiled output, portable builds, local Wiki repositories, inventories, environment files, and SSH private keys. Runtime sessions, credentials, host fingerprints, and repository tokens are stored under the operating system's HedgeCon application-data directory rather than in this source tree.

After cloning, restore development dependencies with `pnpm install`. Generate distributable applications with the build commands below; publish the resulting executables as GitHub release assets rather than committing them to the repository.

## Current status

HedgeCon currently provides:

- Saved SSH sessions organised into folders with unrestricted nested subfolders.
- Drag-and-drop session organisation and session search.
- Password, private-key, and reusable credential-set authentication.
- Operating-system-encrypted storage for optional saved passwords and key passphrases.
- SSH host-key verification, changed-key warnings, and controls for clearing trusted fingerprints.
- A responsive xterm terminal with bounded scrollback and automatic reconnection.
- Multiple simultaneous sessions using tabs.
- Horizontal and vertical multi-pane layouts, drag-to-snap, arbitrary pane counts, and draggable dividers.
- Ping monitoring with latency history, outage duration, and bounded in-memory samples.
- SFTP and SCP upload/download with a remote filesystem browser.
- SSH key generation, import, discovery, fingerprint display, copying, local deletion, and remote `authorized_keys` management.
- An optional CodeMirror-based YAML inventory editor.
- Ansible-compatible YAML inventory import using `all`, `children`, `hosts`, and `vars`.
- Preview and validation before YAML changes replace the GUI inventory.
- Explicit rejection of plaintext password fields in imported YAML.
- An optional Git-backed Markdown wiki for shared notes, per-session notes, and searchable vendor cheat sheets.
- Local repository creation plus HTTPS clone, commit, fast-forward pull, and push for GitHub, Gitea, and compatible Git servers.
- Operating-system-encrypted storage for optional Git access tokens.

## Original scope and remaining roadmap

The original goal is a one-stop networking workspace rather than only an SSH client. The SSH and inventory foundation is now functional. The principal remaining work is:

1. **Configuration collection and history** — download switch, router, firewall, Linux, and Windows configurations; normalise them; show revisions and diffs; and retain Git-style history. The repository and `configs/` foundation now exists, but device-specific collection is not implemented yet.
2. **Advanced Git workflows** — the Wiki can now use local or shared HTTPS repositories; conflict resolution, branches/review workflows, SSH Git remotes, and inventory/config synchronisation remain future work.
3. **Guided network changes** — vendor-aware forms such as “Add VLAN” that render, preview, validate, and apply CLI configuration safely.
4. **Device drivers** — structured support for Juniper, Cisco, Arista, and other network operating systems, including paging control, configuration mode, commit/rollback, and backup commands.
5. **Windows-specific SSH management** — native Windows `authorized_keys` installation and OpenSSH agent/Pageant integration.
6. **Inventory synchronisation** — optional file watching, Git-backed YAML sources, `group_vars`/`host_vars`, and controlled merge behaviour rather than replacement only.
7. **Operational hardening** — automated tests, signed Windows/Linux releases, an update mechanism, crash recovery, audit logging, and accessibility review.

## Running HedgeCon

### Packaged Windows build

Run [HedgeCon.cmd](./HedgeCon.cmd) from the project’s top-level folder. It launches:

```text
release\HedgeCon.exe
```

`HedgeCon.exe` is a portable application and does not require a separate installation. If it has not been built yet, the launcher explains which build command to run.

### Windows installer

For a normal installed application, download and run `HedgeCon-Setup.exe`. The setup wizard installs HedgeCon for the current Windows user, allows the destination folder to be changed, creates Start Menu and desktop shortcuts, and registers HedgeCon in Windows Installed Apps for clean upgrades or removal. Administrative rights are not normally required.

Uninstalling does not delete sessions, credentials, SSH keys, trusted host fingerprints, or Wiki repository settings. These remain in the user's HedgeCon application-data directory unless removed manually.

To return HedgeCon to a completely blank state before uninstalling, publishing screenshots, or testing a fresh installation, open **Settings → Reset all local data**. After an explicit confirmation, HedgeCon removes its saved workspace, encrypted secrets, known-host fingerprints, repository settings, and managed SSH keys, then restarts. External Wiki repositories and keys in the user's normal `.ssh` directory are not removed.

### Development mode

Development requires Node.js and pnpm:

```powershell
pnpm install
pnpm dev
```

The renderer, Electron main process, and TypeScript compiler run in watch mode.

## Basic usage

### First-run workspace setup

On a new profile, HedgeCon asks how inventory should be managed:

- **Local workspace** stores folders and sessions on that computer.
- **Local Git repository** creates or opens a repository containing `inventory.yml` plus the Wiki structure.
- **Shared Git server** clones an HTTPS GitHub, Gitea, or compatible repository and uses its `inventory.yml`.

Git inventory contains folders, sessions, hostnames, ports, usernames, and credential-set references only. Passwords, passphrases, private keys, access tokens, and trusted host fingerprints remain in the operating system's local application-data directory.

For Git-managed workspaces, **Inventory YAML** provides **Load from Git** and **Commit & push** controls. Pulled YAML must pass validation and preview before it replaces the current GUI inventory.

### Create and connect to a session

1. Select **New session**.
2. Enter a display name, hostname or IP address, SSH port, and folder.
3. Choose session-specific credentials or a reusable credential set.
4. Select password or private-key authentication.
5. Save the session and select **Connect**.
6. Verify the server fingerprint before trusting a host for the first time.

If a reusable password credential has no saved password, HedgeCon prompts before attempting the connection. It never intentionally attempts authentication with an empty password.

### Organise sessions

- Select **New folder** to create a top-level folder or a folder inside the currently selected folder.
- Drag a session card onto a folder to move it.
- Use **All sessions** and the search field to search by name, host, or username.
- Double-click a saved session to connect quickly.

### Credentials

Open **Settings → Credential sets** to create credentials shared by several sessions. Updating the set updates every linked session. Passwords and private-key passphrases are optional; when saved, they are encrypted using Electron's operating-system-backed secure storage.

### SSH keys

Open **Settings → SSH keys** to:

- Generate a compatible RSA-3072 key pair.
- Import an existing private key.
- Discover keys in the user's `.ssh` directory.
- Copy a public key or delete a HedgeCon-managed local key.

The private key is the file without the `.pub` suffix. Select it through the private-key selector when configuring a session or credential set.

While connected using an existing authentication method, select **Keys** beneath the terminal. HedgeCon reads the remote `~/.ssh/authorized_keys` file and separates local keys into **Installed on this host** and **Available to install**. Installation and removal currently target POSIX-style Linux, Unix, and network-device shells.

### Tabs and split panes

- Open several sessions to create tabs.
- Use the split controls to arrange sessions horizontally or vertically.
- Drag a session tab toward an edge of the terminal area to snap it into another pane.
- Drag the divider between panes to resize them.
- Close a pane using its corner button; the remaining panes reclaim the space.

### Ping monitoring

Select **Ping monitor** beneath a connected terminal. The graph records recent response time, highlights outages, and reports how long the target was unavailable. Samples and terminal scrollback are bounded so leaving the application open does not cause unlimited memory growth.

### File transfer

Select **Files** beneath a terminal to open the remote filesystem browser. Choose SFTP or SCP, navigate directories, upload a local file, or download a remote file. Availability depends on the remote SSH server and account permissions.

### YAML inventory editor

Select **Inventory YAML** in the sidebar. The editor is optional and loaded only when opened.

- **Reset from GUI** generates an Ansible-compatible representation of the current folders and sessions.
- **Open YAML** loads an existing `.yml` or `.yaml` inventory.
- **Validate & preview** parses the document and reports the resulting folder/session counts and warnings.
- **Apply inventory** replaces the GUI inventory only after confirmation.

Ansible groups become nested folders. Common fields include:

```yaml
all:
  children:
    linux:
      hosts:
        docker-01:
          ansible_host: 192.0.2.10
          ansible_port: 22
          ansible_user: netadmin
```

HedgeCon never treats inventory YAML as a secret store. Fields such as `ansible_password`, `ansible_ssh_pass`, and passphrase values are rejected. Link a host to an existing credential set with `hedgecon_credential_set` instead.

### Git-backed Wiki and notes

Select **Wiki & notes** in the sidebar. The first launch offers two choices:

- **Create / open local** chooses a folder and creates a normal Git repository if needed. A starter general Wiki and Juniper, Cisco, and Linux cheat sheets are added to a new repository.
- **Clone remote** clones an existing HTTPS repository into an empty folder. GitHub, Gitea, and compatible smart-HTTP Git servers are supported.

Enter a Git author name and email. For a private remote, provide its username and personal access token; the token is encrypted with the operating system and is never saved in the repository.

The Wiki contains three areas: general operational notes, one stable Markdown page per saved SSH session, and searchable vendor cheat sheets.

The status dot in the Wiki header checks the configured remote branch. It shows whether the local Wiki is current, behind, ahead, diverged, or local-only. When the remote is ahead, **Quick update** performs the same guarded fast-forward pull without leaving the current page.

While an SSH session is open, select **Notes** beside Ping monitor, Files, and Keys to open that session's page directly. The Wiki overlays the workspace, so the SSH session and active monitoring remain running while notes are edited.

Select **Save page** to write locally. Saving does not silently publish anything: review the changed-file count, enter a message, select **Commit**, then **Push**. **Pull** is deliberately fast-forward-only and refuses to run while local files are uncommitted, avoiding automatic conflict resolution or accidental overwrites.

## Building standalone applications

Build and type-check the application assets:

```powershell
pnpm build
```

Create the portable Windows executable:

```powershell
pnpm package:win
```

Output:

```text
release\HedgeCon.exe
```

Create the Windows setup wizard:

```powershell
pnpm package:win:installer
```

Output:

```text
release\HedgeCon-Setup.exe
```

Create a Linux AppImage from a Linux build environment:

```bash
pnpm package:linux
```

Output:

```text
release/HedgeCon-x64.AppImage
```

Cross-building Linux packages from Windows is not the supported release path; use a Linux workstation or CI runner.

## Security notes

- Renderer sandboxing and context isolation are enabled.
- Unexpected navigation, popup windows, and renderer permission requests are denied.
- SSH host fingerprints are checked against locally trusted values.
- Saved secrets are encrypted by the operating system and are not included in inventory YAML.
- Private-key, remote-path, terminal-input, and inventory sizes are bounded and validated.
- Generated packages are currently unsigned development builds. Operating systems may warn before running them until a code-signing process is added.
