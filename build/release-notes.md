# HedgeCon v0.2.9-experimental.5

## Workspace lifecycle and memory fixes

- Keep SSH, web and VNC workspaces mounted while browsing session folders, preserving active connections when returning.
- Remove split-screen dividers while the session library is visible and restore them cleanly on return.
- Return keyboard focus to the active terminal after running or inserting a macro, including prompted-variable macros.
- Replace the Wiki's manually managed secondary React root with a single deterministic component lifecycle.
- Hide embedded browser views behind the Wiki to prevent native web content remaining active over its setup screen.

This remains an experimental release for validating session preservation and first-time Wiki memory behaviour. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

---

# Previous experimental release highlights

## v0.2.9-experimental.4

## Terminal focus and Wiki picker fixes

- Automatically focus newly opened and newly selected SSH terminals so commands can be typed immediately.
- Preserve modal-dialog focus instead of redirecting keyboard input to the terminal underneath.
- Open the Windows Wiki folder picker on a real, pre-created persistent directory.
- Use platform-appropriate folder-picker options and avoid adding Wiki locations to Windows Recent Items.

This remains an experimental release for validating connection stability and Windows folder-picker behaviour. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

---

# Previous experimental release highlights

## v0.2.9-experimental.3

## Connection stability fixes

- Keep SSH, web and VNC sessions mounted when switching tabs so live connections and page state are preserved.
- Hide inactive embedded browser views without recreating them when their tab is selected again.
- Coalesce simultaneous invalid-certificate requests into a single trust prompt.
- Remember an accepted host and certificate fingerprint for the lifetime of its browser tab, then forget it when the tab closes.

This remains an experimental release for testing connection stability and the macro organisation workflow. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

---

# Previous experimental release highlights

## v0.2.9-experimental.2

## Macro and update-page fixes

- Fix dragging macro cards into top-level and nested macro folders in Electron.
- Highlight valid macro-folder drop targets and retain a compatible fallback drag format.
- Keep update action buttons in a stable position across current, available and downloaded states.
- Give release notes a larger reading area with clearer text, spacing and contrast.

This remains an experimental release for testing the macro organisation workflow. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

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

This remains an experimental release for testing the new macro organisation workflow. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

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

This stable release promotes the tested experimental feature set to the main update channel. Its Windows binaries remain unsigned while the SignPath Foundation application is under review.

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

This remains an experimental release. Its Windows binaries are unsigned while the SignPath Foundation application is under review.

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

This remains an experimental release. Its Windows binaries are unsigned while the SignPath Foundation application is under review.
