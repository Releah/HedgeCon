# HedgeCon v0.2.3

This release corrects terminal control behaviour, refines update status styling, and prevents Wiki data from being placed where an update can remove it.

## Terminal controls

- Close the terminal background-colour palette immediately after selecting a colour.
- Move the jump-to-latest arrow into the terminal canvas instead of positioning it relative to the bottom tools strip.
- Keep the arrow correctly positioned when the ping monitor is open.

## Update status

- Restyle the sidebar update indicator as a compact rounded rectangle consistent with HedgeCon's New session action.
- Preserve the expandable **Update** and **Up to date** labels.

## Wiki storage

- Default Wiki creation and Gitea clones to `Documents/HedgeCon Wiki`.
- Prevent choosing a Wiki location inside the replaceable HedgeCon installation directory.
- Explain why the location is unsafe and suggest the persistent Documents location.
