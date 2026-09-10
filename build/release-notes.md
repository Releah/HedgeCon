# HedgeCon v0.3.15

## Reliable multiline terminal paste

- Preserve commands, blank lines and trailing returns when pasting multiline text into an SSH terminal.
- Normalise Windows, Linux and macOS clipboard line endings into terminal Enter presses.
- Send large pasted configurations in ordered chunks with a short pause between lines, improving reliability on switches and other rate-sensitive network devices.
- Keep normal keyboard input immediate and cancel pending paste work when its SSH session closes.
- Support right-click paste, Ctrl+V, Ctrl+Shift+V and Shift+Insert consistently inside the terminal.

Windows binaries are unsigned.

---

# Previous stable release

## v0.3.14

## Context-aware commands and device health

- Add an optional context-aware Suggestions section to the Macros panel.
- Recognise interface, BGP, OSPF and BFD terminal context on Juniper Junos, Cisco and Dell SmartFabric OS10 devices.
- Offer bounded, read-only diagnostic commands that are pasted for review and never run automatically.
- Temporarily highlight relevant interfaces and peer addresses in terminal output.
- Add background CPU, memory and storage telemetry to the Monitor panel for supported Linux, Junos, Cisco and OS10 devices.
- Sample device health every ten seconds through an isolated SSH channel without typing into the visible terminal.
- Display partial telemetry when a device exposes only some metrics, and fail quietly when telemetry is unsupported or restricted.

Windows binaries are unsigned.

---

# Previous stable release

## v0.3.13

## Sortable session tables

- Sort compact and detailed session tables by clicking their data-column headings.
- Toggle between ascending and descending order with a visible direction indicator.
- Sort by reachability, session name, address, services, detected hostname, make, model or operating system, and version.
- Use natural numeric comparison for addresses and version-like values.
- Keep Connect and Actions as controls rather than misleading sortable columns.
- Use reachability wording that applies correctly to both direct ICMP checks and SOCKS5 TCP monitoring.

Windows binaries are unsigned.

---

# Previous stable release

## v0.3.12

## Routed SSH, better profiling and flexible session views

- Add an explicit per-session option to route SSH connections through a SOCKS5 proxy.
- Default new SOCKS5 tunnel listeners and routed SSH sessions to the standard local port `1080`, while keeping the port configurable.
- Add end-to-end tunnel verification, safe connection-refusal handling and SOCKS5-aware SSH reachability monitoring.
- Preserve normal target host-key verification and SSH authentication through the proxy.
- Preserve local proxy routing preferences when a shared inventory is refreshed without publishing machine-specific settings to inventory YAML.
- Add adjustable card, compact table and detailed table views to the session library.
- Show detected hostname, vendor, model or operating system, version, service actions and reachability in table views.
- Improve bounded automatic discovery for Dell OS9/OS10/Enterprise SONiC, Cisco IOS/IOS-XE/IOS-XR/NX-OS/ASA/Firepower and Juniper Junos devices.
- Keep background discovery separate from the visible terminal and support Junos root-shell discovery through `cli`.
- Make terminal background-colour selection reliable while moving between the toggle and popup.
- Add weekly dependency audits, pull-request dependency review and Dependabot update configuration.

For routed sessions, start the gateway SOCKS5 tunnel before opening a session configured to use its local listener. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.12-experimental.5

## Usable SOCKS5 SSH routing

- Add an explicit per-session option to route SSH connections through a SOCKS5 proxy.
- Default new SOCKS5 tunnel listeners and routed SSH sessions to the standard local port `1080`, while keeping the port configurable.
- Perform the SOCKS5 handshake inside HedgeCon and preserve normal target host-key verification and SSH authentication.
- Add end-to-end tunnel verification against a chosen destination and port, with latency and clear failure feedback.
- Allow active SOCKS5 tunnels to be tested again from SSH Tools.
- Preserve local proxy routing preferences when a shared inventory is refreshed without publishing machine-specific settings to inventory YAML.

This experimental release is intended for testing SSH access to internal devices through an existing HedgeCon SOCKS5 tunnel. Start the gateway tunnel before opening sessions configured to use it. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.12-experimental.4

## Reliable terminal colour selection

- Keep the terminal colour menu open while the pointer is over either the colour toggle or popup.
- Add a short grace period while moving across the gap between the toggle and colour choices.
- Cancel pending closure when the pointer returns to the menu.
- Continue closing immediately after a background colour is selected.

This experimental maintenance release fixes intermittent colour-menu closure without changing the established click-to-toggle behaviour. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.12-experimental.3

## Automatic multi-vendor profiling

- Let automatic profiling progress from passive terminal evidence to bounded, read-only background SSH exec probes before requiring manual intervention.
- Keep background probes separate from the visible terminal while allowing useful partial identities to be reviewed.
- Add broader SmartFabric OS10, OS9/FTOS, N-Series, PowerConnect and Dell Enterprise SONiC detection.
- Expand Cisco IOS, IOS-XE, IOS-XR, NX-OS/Nexus, ASA, Firepower, Secure Firewall and IOSv parsing.
- Improve hostname, chassis, model, PID, software-version and hardware-field extraction across Dell and Cisco output formats.
- Detect Junos root-shell prompts and use `cli -c` for background discovery.
- Enter `cli` before bounded manual Junos commands when a root account is still at the underlying shell.
- Make compact and detailed session tables fit the available page width and align Web, RDP, VNC and Serial button colours with session cards.

Background discovery commands do not appear in HedgeCon's visible terminal, but managed devices may record them in their audit logs. This experimental release is intended for multi-vendor profiling and session-table testing. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.12-experimental.2

## Flexible session-library views

- Add a bounded card-size slider that changes how many session cards fit while preserving their connection information and actions.
- Add a compact table view for scanning session status, address, services and available connection types.
- Add a detailed table view containing detected hostname, vendor, model or operating system, and version information.
- Keep edit, clone, fingerprint and delete actions available from table rows.
- Preserve double-click connection and drag-to-folder behavior in table views.
- Remember the selected view and card size locally between HedgeCon launches.
- Use horizontal table scrolling on narrower windows instead of hiding profiled device details.

This experimental release is intended for testing the more flexible session manager before promotion to Stable. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.12-experimental.1

## Non-blocking device-profile notifications

- Replace the central device-discovery dialog with a notification inside the relevant terminal.
- Keep the terminal interactive while detected hostname, vendor, model and version details await review.
- Collapse unattended notifications into a compact indicator after ten seconds and expand them again on click.
- Allow detected details to be remembered or dismissed without interrupting the active session.
- Remember dismissed identity suggestions locally so the same details do not repeatedly appear after reconnecting; changed details can still notify again.
- Keep manual Refresh profile results available for explicit review.

This experimental release is intended for testing the quieter device-profiling workflow before promotion to Stable. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.11

## Reliable profile refresh

- Restyle device-detection progress and result messages to match the HedgeCon SSH Tools panel.
- Prevent stale passive-detection results from repeatedly reopening the device confirmation dialog.
- Record profile decisions immediately so accepted or rejected details are not prompted for again.
- Refresh the managed device-information table in shared session notes as soon as a profile is accepted.

This stable maintenance release makes manual device re-profiling predictable and keeps session documentation in sync. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.10

## Operator-controlled device profiling

- Keep automatic profiling genuinely passive by inspecting only the banner and terminal output a device naturally sends.
- Never type discovery commands into a terminal automatically; incomplete passive results now stop silently.
- Add an explicit Detect device action to SSH Tools for sessions without a confirmed profile.
- Add Refresh profile for previously identified devices and clearly explain that bounded read-only commands may appear in restricted terminals.
- Retain the existing review and confirmation dialog before detected device information is remembered.

This stable maintenance release makes active device profiling an explicit operator action while preserving silent, non-intrusive passive discovery. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.9

## Juniper device profiling

- Recognise hostname fields from classic Junos, Junos OS Evolved and alternate system-information formats.
- Parse additional Junos release, generic version, model and hardware-model output formats.
- Continue discovery when an initial Juniper match is incomplete instead of prematurely remembering missing hostname or version details.
- Fall back to bounded `show version`, chassis hardware and system-information commands with Juniper's `no-more` output handling through the active terminal when hidden channels are unavailable.

This stable maintenance release improves automatic Juniper identity collection and the managed device-information block in session Wiki pages. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.8

## Restricted-channel Cisco compatibility

- Fall back to the existing interactive terminal when a Cisco device rejects the comparator's additional SSH exec or shell channel.
- Capture validated read-only output until the terminal becomes idle, advance recognised paging prompts and remove command echoes and device prompts before comparison.
- Prevent overlapping read-only captures on the same terminal while keeping the executed command visible to the operator.

## Cisco IOSv discovery

- Reuse the active terminal channel for automatic profiling when IOSv refuses hidden discovery channels.
- Recognise Cisco IOSv model markers, IOS versions and the hostname from standard uptime output.
- Capture `show version` first and request `show inventory` only when more identity evidence is required.
- Populate the confirmed session identity and managed Wiki information instead of falling through to Unknown SSH device.

This stable maintenance release improves comparison and automatic profiling on Cisco devices that permit only their active interactive SSH channel. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.7

## Configuration comparator

- Add a dedicated Compare workspace above Macros for pasted text and local configuration files.
- Capture the same guarded, read-only command from two active SSH sessions without reconnecting or disturbing their terminal tabs.
- Highlight added, removed and changed rows while retaining configuration order and hierarchy.
- Optionally ignore whitespace, blank lines and common volatile details such as timestamps, uptime and traffic counters.
- Keep live configuration captures in memory only rather than restoring configuration backups or history.
- Resize the two source panels horizontally and allocate more or less vertical space between source text and the rendered diff, with both layouts remembered locally.
- Support guarded read-only Unix inspection commands such as `ls`, `pwd`, `cat`, `head`, `tail`, `stat`, `df` and `du` alongside network show/display/get commands.

## Tabs and session workflow

- Reorder session tabs by dragging them along the tab bar.
- Create named, colour-coded tab groups, move tabs between groups, collapse groups and dissolve them without closing sessions.
- Exit a split layout while keeping every connection alive as an ordinary tab.
- Require a real ICMP echo reply before showing a session as online, avoiding temporary false-green indicators.
- Choose SSH, Web, RDP, VNC or Serial directly from the new-tab session picker according to each device's configured services.
- Replace the exposed native tab scrollbar with compact overflow controls, mouse-wheel navigation and automatic scrolling to the selected tab.

## Embedded browser reliability

- Hide native device webpages whenever Compare, Macros, Wiki, Settings or another HedgeCon workspace is shown above them.
- Own the initial device-page navigation inside browser creation so saved URLs begin loading without clicking the address bar and pressing Enter.
- Install certificate, navigation and error handlers before the first request and keep the native page hidden until startup is ready.

## Notes and device compatibility

- Open terminal-side session notes in rendered Markdown preview and switch explicitly into editing when needed.
- Seed a practical Markdown guide for existing and new Wiki workspaces without overwriting user pages.
- Improve Cisco IOS, IOS XE, IOS XR, NX-OS and ASA identification and prevent echoed probe commands from being mistaken for Windows output.
- Fall back to an isolated read-only shell probe on network devices that reject SSH exec channels.
- Avoid incorrectly offering legacy SSH compatibility after sleep or hibernation unless negotiation reports a specific algorithm mismatch.

## Release pipeline

- Cache pnpm dependencies and Electron packaging downloads on Windows and Linux to shorten repeat release builds.

This stable release promotes the tested comparator, tab organisation, device profiling, Markdown preview and connectivity refinements. Live captures are not saved. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.6

## Legacy SSH compatibility

- Keep modern SSH algorithms as the default and detect negotiation failures caused by obsolete device security.
- Show an explicit HedgeCon warning before enabling legacy key exchange, host keys, ciphers or message-authentication algorithms.
- Remember approval locally for only the selected host and port, without placing the exception in shared inventory.
- Remove the legacy exception alongside host trust when an operator uses Forget fingerprint.

## Dell and SONiC discovery

- Recognise additional Dell OS9 and OS10 version, model and platform output formats.
- Identify SONiC as a network operating system rather than its underlying Debian installation.
- Collect SONiC version, hardware SKU, ONIE platform and hostname details through bounded, read-only probes.

## Documentation

- Remove the discontinued SignPath onboarding and signing references after the certificate application was declined.
- Clearly document that current Windows packages are distributed unsigned.

This stable maintenance release expands compatibility with older SSH devices and improves Dell and SONiC device profiling.

---

# Previous stable release

## v0.3.5

## Broader device profiling

- Extend passive SSH identification beyond Linux and Windows with vendor-specific signatures and safe probes for Juniper, Cisco, Arista, Fortinet, Palo Alto, HPE/Aruba, Huawei, Dell, Extreme, MikroTik, Ubiquiti/VyOS, Brocade/Ruckus and F5 devices.
- Use the device's initial terminal banner as additional discovery evidence, improving identification on restricted network-device shells.
- Keep discovery bounded and non-intrusive while retaining the existing operator confirmation flow.

## Pinned macro panel

- Add a pin control to the terminal macro panel.
- Keep macros visible while switching between active SSH sessions and when opening another session.
- Unpin globally when the pinned panel is closed, returning terminals to their normal per-tab behaviour.

This stable maintenance release improves multi-vendor device discovery and makes repeated macro execution across several sessions faster. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.4

## Focused macro targeting

- Rename the Commands navigation entry and terminal heading to Macros for consistent terminology.
- Target macro favourites either by session folder or by automatically profiled operating system, avoiding ambiguous mixed rules.
- Default new folder-targeted macros to All folders and offer an equivalent All known OSs option for profiled devices.
- Preserve existing macros with predictable legacy-target migration when they are edited.

## Documentation and project scope

- Refresh the README around the complete desktop feature set, including discovery, tunnels, serial consoles, session logging, private notes, Wiki images and update controls.
- Move configuration collection, history and broader observability scope to HedgeSight.
- Document the remaining legacy-SSH and platform-packaging boundaries without presenting them as completed features.

This stable release promotes the tested v0.3.4 device-discovery, SSH-tunnel, browser-startup and interface refinements. HedgeCon's core desktop connectivity workflows are now feature complete, with future work focused on compatibility, reliability and focused user feedback. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.4-experimental.2

## Passive device discovery

- Run bounded, read-only device probes automatically after an SSH connection succeeds.
- Prompt only when a device is first identified or its detected signature changes.
- Remember confirmed hostname, platform, make, model or operating system, and version without reconnecting the terminal.
- Allow an incorrect result to be marked Unknown and suppress repeat prompts until the detected signature changes.
- Keep remembered device information visible at the top of SSH Tools without a manual Detect control.

## Session Wiki information

- Add a managed device-information table to the top of shared session Wiki pages.
- Show hostname, address, make, model or OS, and version, using TBC where information is unavailable.
- Refresh only the managed information block while preserving all operator-written notes.

## Interface polish

- Restyle the SSH Tools panel, tunnel forms, selectors, buttons and scrollbar to match HedgeCon.
- Apply HedgeCon's slim dark scrollbar treatment to the main session-library content.

This experimental maintenance release refines the device-discovery and SSH-tunnel experience introduced in v0.3.4-experimental.1.

---

# Previous experimental release

## v0.3.4-experimental.1

## SSH device identification

- Identify Windows, Linux and common network-device platforms through the existing authenticated SSH connection.
- Report vendor, product, version and confidence using bounded, read-only probes with strict output and time limits.
- Recognise common Cisco, Juniper, Arista, Fortinet, MikroTik and HPE Aruba version signatures.
- Keep detected information provisional until the operator explicitly applies it to the session.

## Managed SSH tunnels

- Open a dedicated SSH Tools side panel from an active terminal.
- Create loopback-only local port forwards to services reachable from the SSH host.
- Run a local SOCKS5 proxy through the active SSH connection, including IPv4, IPv6 and hostname destinations.
- Select a fixed local port or let HedgeCon choose an available port automatically.
- Display active client counts, stop tunnels individually and automatically close every tunnel when its SSH session ends.

## Embedded browser startup

- Create and position the native browser before navigating to the saved address.
- Use the same reliable navigation route for initial page loading as the address-bar Go action.
- Preserve the existing in-app certificate verification flow without speculative reloads.

This experimental release is intended for testing device discovery, local forwarding, SOCKS proxying and the revised embedded-browser startup sequence. SSH tunnels bind only to `127.0.0.1`; they are not exposed to the local network. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.3

## Embedded browser certificate handling

- Show the untrusted-certificate prompt during the initial page load without requiring the address bar to be submitted again.
- Hide the embedded browser surface as soon as certificate verification begins so the prompt remains visible and interactive.

## Macro panel stability

- Keep exactly one macro side panel mounted during periodic session-reachability updates.
- Remove the brief duplicate or “ghost” macro panel flash without changing the panel's persisted open state.

## Reliable terminal highlighting

- Restore ANSI-based regex colouring as the primary rendering path while retaining validation, limits and ANSI-sequence protection.
- Ensure explicit regex colours override the configured default foreground only for matching text.
- Retain xterm decorations as a secondary repaint path for recent SSH and serial output.

## Deterministic tab indicators

- Show unread blue only when real SSH or serial output arrives while a tab is hidden.
- Clear or suppress unread state immediately when a tab is visible in any split pane.
- Prevent legacy Web, VNC and secondary-pane colours from overriding online, offline, checking or unread states.

## Embedded browser fixes

- Retry the initial device-page navigation once after a transient startup failure.
- Replace the credential-drawer keyboard symbol with a clear key icon.
- Keep a temporary capture of the live webpage visible behind the credential overlay instead of showing a white surface, then discard it when the drawer closes.

This stable release promotes the tested v0.3.3 feature set, including live session awareness, terminal regex reliability, browser credential improvements, Wiki image support and the final browser and macro-panel fixes. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.3-experimental.2

## Split workspace polish

- Hide split-pane resize dividers while Settings is open so they cannot appear above the modal.
- Restore dividers at their existing position when Settings closes.
- Keep each SSH pane's close control attached to the visible terminal edge while Notes, Files or Macros are open or resized.

## Terminal regex rendering

- Treat paired outer `^` and `$` anchors as boundaries around a highlighted terminal fragment instead of requiring the shell prompt and whole rendered line to match.
- Repaint recent SSH and serial terminal lines immediately when regex settings change.
- Preserve expression validation, rendering limits and protection against unsafe patterns.

This experimental maintenance release refines split-terminal controls and terminal regex highlighting based on testing of v0.3.3-experimental.1.

---

# Previous experimental release

## v0.3.3-experimental.1

## Live session awareness

- Show live ICMP reachability on session cards and tabs, with green online, red offline and neutral checking states.
- Turn a terminal tab indicator blue when new output arrives while that tab is not visible.
- Split the workspace naturally when dragging the currently viewed tab: place it on the requested edge and use its adjacent tab for the other pane.

## Terminal colour reliability

- Validate terminal regex rules before saving them, including safeguards for expressions likely to stall terminal rendering.
- Restore regex highlighting for typed, pasted and remotely received terminal text, and link to Regex101 from Settings for help.
- Reset the terminal foreground and default background colours together without removing custom meanings or regex rules.

## Browser credentials

- Open a non-resizing credential drawer over embedded device webpages.
- Copy saved usernames and passwords independently, with passwords decrypted only in the Electron main process directly into the operating-system clipboard.

## Wiki images

- Paste Snipping Tool captures and other clipboard images directly into the Wiki editor.
- Store PNG, JPEG, GIF and WebP images beside their page in an `assets` folder and render them in Preview.
- Include shared and session-note images in Git while keeping Private Notes images in local-only storage.

This experimental release is intended for testing the new session indicators, safer terminal matching, browser credential workflow and Wiki image support before promotion to Stable. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.2

## Session manager and Wiki fixes

- Remove the stray `0` shown in the session manager when no workspace tabs are open.
- Make existing Wiki pages reliably draggable into folders in Electron.
- Allow pages to be dragged back to the top level by dropping them on their section heading.
- Preserve private/shared Wiki boundaries and the separate folder-reordering workflow.

This stable maintenance release contains focused interface fixes for HedgeCon v0.3.1. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.1

## Wiki and serial-console fixes

- Make Wiki folder reordering reliable in Electron by retaining the active folder throughout the drag gesture.
- Preserve the existing page-to-folder drag workflow and locally persisted folder order.
- Restyle the serial-profile Settings link to match HedgeCon instead of the native white button appearance.
- Match the Console sidebar button typography and dimensions to New session.

This stable maintenance release contains focused interface fixes for HedgeCon v0.3.0. Windows binaries are unsigned.

---

# Previous stable release

## v0.3.0

## Local serial-console profiles

- Move baud rate, data bits, parity and stop bits into reusable local serial profiles in Settings.
- Add a dedicated Console launcher beside New session, with profile and detected-adapter selection.
- Keep physical adapter paths and serial profiles local instead of treating console access as a shared inventory session.

## Terminal awareness and records

- Add configurable regex text-colouring rules for SSH and serial terminals, including typed, echoed, pasted and remote output.
- Add optional rolling plaintext SSH session logs with retention, per-file and total-storage limits.
- Organise logs into session-and-host folders with daily subfolders while retaining automatic pruning.

## Wiki and private knowledge

- Keep private session and general notes in local-only storage outside Git.
- Promote Private Notes to its own protected Wiki root alongside General, Vendor and Session Notes.
- Create pages and nested folders directly from right-click menus, and remove the old bottom creation form.
- Reorder sibling Wiki folders by dragging them above or below one another and remember the custom layout locally.
- Preserve protected roots while supporting rename, safe deletion and page moves for their child folders.

## Release control and feedback

- Browse compatible older Stable or Experimental releases and deliberately downgrade through the trusted updater flow.
- Add an in-app Bug Report and Feature Request form without collecting logs, sessions, notes or credentials.
- Keep the terminal macro panel open after commands run and across visits to the Commands library.
- Make successful feedback notifications dismiss immediately when clicked.

## Release packaging

- Publish the Windows installer without the additional portable executable to reduce release build time and artifact size.

This stable release promotes the tested v0.3 feature set to the main update channel. Private notes and serial profiles remain local to each device. Windows binaries are unsigned.

---

# Previous experimental release

## v0.3.0-experimental.1

## Serial connectivity and terminal awareness

- Add serial sessions alongside SSH, Web, RDP and VNC, with discovered ports and configurable baud rate, data bits, parity and stop bits.
- Share serial-session definitions through Inventory YAML while keeping the physical port selection explicit.
- Add configurable regex text-highlighting rules for live SSH and serial output, preserving terminal control sequences and safely ignoring invalid expressions.
- Keep edited highlighting rules live in already-open terminals.

## Session records and private knowledge

- Add optional rolling plaintext SSH session logs with retention age, per-file size and total-storage limits.
- Keep the terminal macro panel open after commands run and across visits to the Commands library.
- Switch each session note panel between shared Git-backed notes and private notes stored only in the local HedgeCon profile.
- Show a local-only Private Notes folder beneath General Notes with nested folders, search and the existing Wiki organisation controls, without exposing its files to Git operations.

## Release control and feedback

- Browse compatible older Stable or Experimental releases and deliberately downgrade an installed client through the trusted updater flow.
- Warn before installing older versions that may not understand settings created by newer clients.
- Add an in-app Bug Report and Feature Request form beside the update indicator.
- Prepare a structured, labelled issue for review on the official HedgeCon GitHub repository without collecting logs, sessions, notes or credentials.

This is an experimental release for quality and regression testing of the new connectivity, terminal, privacy and support workflows. Private notes are local-only rather than encrypted. Windows binaries are unsigned.

---

# Previous stable release highlights

## v0.2.9

## Organised, session-aware command macros

- Organise macros into resizable, nested custom folders with create, rename, delete, collapse and whole-card drag-and-drop interactions.
- Group the All macros board by folder while retaining focused individual-folder views and session-aware favourites.
- Resolve safe built-in template values such as username, host, SSH port and session name from the active session.
- Prompt for one or more user-defined values, preview the rendered command, and optionally run it immediately.
- Explain built-in and user-defined variables directly in the macro builder without exposing passwords, tokens or private-key contents.

## Connection and workspace reliability

- Preserve active SSH, web and VNC connections while switching tabs or browsing the session library.
- Restore terminal focus when opening tabs, returning to active sessions and running macros.
- Coalesce repeated invalid-certificate requests and remember temporary browser trust for the lifetime of a tab.
- Correct Wiki first-run folder selection and component cleanup to avoid runaway resource usage.
- Keep split-screen controls and macro colour selectors correctly positioned.

## Interface and release improvements

- Refine the compact macro-card layout and match session-card drag behaviour.
- Expand and stabilise the update release-notes area.
- Build releases behind a hidden draft and publish the release tag only after Windows and Linux artifacts are complete.
- Update GitHub Actions to their Node.js 24-compatible runtimes.

This stable release promotes the tested experimental feature set to the main update channel. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.8

## Macro-board interaction fixes

- Show one clean automation icon on each macro card instead of layering it over the previous terminal glyph.
- Keep the All commands heading and board explicitly within the main content column, removing wasted sidebar space.
- Drag a macro from anywhere on its card, matching the natural whole-card interaction used by session cards.
- Remove the separate drag grip while retaining folder highlighting and nested-folder moves.
- Keep GitHub releases hidden as drafts until Windows and Linux updater artifacts have both uploaded.

This remains an experimental release for testing the refined macro-library interaction before promotion to main. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.7

## Compact macros and session-aware variables

- Reduce macro-card height and empty space so more commands fit comfortably on the button board.
- Replace the terminal-style macro-card symbol with a clearer automation icon.
- Resolve safe built-in macro variables from the active session, including username, host, SSH port and session name.
- Continue prompting for any user-defined variables, with support for multiple values in one command.
- Add expandable Variable help to the macro editor with built-in and prompted-variable examples.
- Keep passwords, tokens, passphrases and private-key contents unavailable to macros.

This remains an experimental release for testing session-aware command templates before promotion to main. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.6

## Macro library and split-terminal polish

- Group the All macros board by macro-folder path, including nested folder names and an Unfiled group.
- Show the number of commands in each macro group while retaining normal individual-folder views.
- Add a dedicated drag grip to each macro card to provide reliable folder moves in Electron.
- Keep macro-folder rows outside Electron's draggable window region and highlight valid drop targets.
- Shift the terminal background-colour selector left in split layouts so it does not overlap the pane-close button.

This remains an experimental release for testing the final macro-library workflow before promotion to main. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.5

## Workspace lifecycle and memory fixes

- Keep SSH, web and VNC workspaces mounted while browsing session folders, preserving active connections when returning.
- Remove split-screen dividers while the session library is visible and restore them cleanly on return.
- Return keyboard focus to the active terminal after running or inserting a macro, including prompted-variable macros.
- Replace the Wiki's manually managed secondary React root with a single deterministic component lifecycle.
- Hide embedded browser views behind the Wiki to prevent native web content remaining active over its setup screen.

This remains an experimental release for validating session preservation and first-time Wiki memory behaviour. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.4

## Terminal focus and Wiki picker fixes

- Automatically focus newly opened and newly selected SSH terminals so commands can be typed immediately.
- Preserve modal-dialog focus instead of redirecting keyboard input to the terminal underneath.
- Open the Windows Wiki folder picker on a real, pre-created persistent directory.
- Use platform-appropriate folder-picker options and avoid adding Wiki locations to Windows Recent Items.

This remains an experimental release for validating connection stability and Windows folder-picker behaviour. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.3

## Connection stability fixes

- Keep SSH, web and VNC sessions mounted when switching tabs so live connections and page state are preserved.
- Hide inactive embedded browser views without recreating them when their tab is selected again.
- Coalesce simultaneous invalid-certificate requests into a single trust prompt.
- Remember an accepted host and certificate fingerprint for the lifetime of its browser tab, then forget it when the tab closes.

This remains an experimental release for testing connection stability and the macro organisation workflow. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.2

## Macro and update-page fixes

- Fix dragging macro cards into top-level and nested macro folders in Electron.
- Highlight valid macro-folder drop targets and retain a compatible fallback drag format.
- Keep update action buttons in a stable position across current, available and downloaded states.
- Give release notes a larger reading area with clearer text, spacing and contrast.

This remains an experimental release for testing the macro organisation workflow. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.9-experimental.1

## Organised macro libraries

- Organise macros into unrestricted nested custom folders without changing their session-folder or platform favourites.
- Resize the Commands library tree and remember its width.
- Create top-level folders and subfolders, rename them, or safely delete them through matching right-click menus.
- Promote macros and direct child folders one level when their parent folder is deleted.
- Drag macros between folders or back into Unfiled.
- Collapse library folders and persist their state between visits.
- Display the same macro-folder hierarchy in active SSH sessions while retaining session-aware favourite filtering and search.
- Remember the terminal macro tree's expanded and collapsed folders per session-library folder, so related sessions share a layout.
- Preserve macro folders and assignments through inventory imports and application updates.

This remains an experimental release for testing the new macro organisation workflow. Its Windows binaries are unsigned.

---

# Previous stable release highlights

## v0.2.8

## Command macros

- Add a global searchable Commands library and editable macro button board.
- Open a session-aware macro board from active SSH terminals, with favourites matched by folder hierarchy or saved platform.
- Support prompted `{{ variable }}` substitutions with a rendered preview before insertion.
- Paste rendered commands without submitting them automatically, leaving operators in control of execution.
- Persist macros in HedgeCon's protected local application data with validation and size limits.
- Synchronize Linux, Windows and network-device platform classifications through inventory YAML.
- Optionally run a macro immediately after insertion, while keeping review-first behaviour as the default.
- Resize the active-terminal macro panel and remember its width.

## Folder and session-card refinements

- Rename or safely delete session folders through a right-click menu; contents move up one level on deletion.
- Add matching rename/delete interactions to General and Vendor Wiki folders with collision protection.
- Remove custom-folder counters and improve long-name truncation across the session and Wiki sidebars.
- Keep Clone as an icon-only card action and restore accurate Password or SSH Key authentication labels.
- Create nested folders directly from the right-click menu in both the session library and Wiki.
- Expand the update release-notes reader to the full available width with actions beneath it.

## Project and community

- Add structured GitHub forms for bug reports and feature requests.
- Add an optional Buy Me a Coffee link for supporting HedgeCon development.

This stable release promotes the tested experimental feature set to the main update channel. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## v0.2.8-experimental.3

## Session library and connection refinements

- Resize the session-library sidebar with a persisted width and cleaner, smaller navigation typography.
- Keep long folder names on one line with ellipsis truncation and full-name hover text.
- Delete folders from a right-click context menu; sessions and child folders safely move up one level.
- Replace session-card text actions with compact icons and keep connection buttons aligned as services are added.
- Configure HTTP(S) as an explicit session service so its address is shown only when Web access is enabled.
- Assign a separate saved credential set to RDP and VNC sessions without placing passwords on command lines.
- Choose a default remote-desktop resolution and fullscreen preference in Settings.

This remains an experimental release. Its Windows binaries are unsigned.

---

# Previous experimental release highlights

## Session services and interface polish

- Choose SSH, RDP and VNC independently for each session, including single-service and mixed-service configurations.
- Keep existing sessions backward-compatible with SSH enabled by default and synchronize selections through `hedgecon_services` in inventory YAML.
- Show only configured connection actions and open the first appropriate service when a session is selected.
- Align the RDP and VNC port fields, remove mismatched number controls and match the connection-dialog scrollbar to the rest of HedgeCon.

This experimental release adds RDP and VNC connectivity alongside the existing SSH and device-browser workspace.

## Remote desktop

- Add optional RDP and VNC endpoints to saved sessions and shared inventory YAML.
- Launch Microsoft Remote Desktop on Windows and Remmina or FreeRDP on Linux, including a user-confirmed Remmina installation prompt for supported Linux package managers.
- Add an embedded noVNC workspace tab backed by a random-token, loopback-only bridge; VNC passwords are held only for the active connection.
- Add browser dark-mode preferences and an in-app certificate verification prompt matching SSH host verification.
- Replace the Web connection arrow with a globe icon.

This experimental release adds isolated device web-interface tabs and refreshes HedgeCon's documentation and security disclosures.

## Device web interfaces

- Save an optional HTTP or HTTPS management address with a session.
- Launch separate SSH and Web tabs from the same session card.
- Navigate with Back, Forward, Reload, an editable address bar and an Open externally control.
- Share device web addresses through `hedgecon_web_url` in inventory YAML without sharing cookies or credentials.
- Keep browser cookies in a separate persistent partition for each device address.

## Browser security boundary

- Run device pages in sandboxed `WebContentsView` processes without Node.js, preload scripts, filesystem access or HedgeCon APIs.
- Deny browser permission requests, reject credentials embedded in URLs and contain popup navigation in the device tab.
- Require confirmation before opening unencrypted HTTP pages.
- Show certificate details and require explicit temporary approval for untrusted HTTPS certificates.
- Use a save dialog for downloads initiated by device pages.
- Destroy browser processes cleanly when tabs or HedgeCon close.

## Documentation

- Update the README to cover device browsing, resizable monitoring, shared credential profiles, current Git conflict handling, Wiki organisation and current security behaviour.
- Extend the public privacy statement to disclose user-directed device-browser traffic and locally retained cookies.

This remains an experimental release. Its Windows binaries are unsigned.
