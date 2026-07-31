# HedgeCon v0.2.2

This release polishes terminal colour selection, update visibility, and the Wiki workflow while hardening settings persistence across updates.

## Terminal colours

- Close the terminal colour palette immediately after selecting a colour.
- Keep click-to-toggle behaviour between the default background and first configured meaning.

## Update status

- Show a green tick in the sidebar when HedgeCon is current.
- Expand the green status to **Up to date** on hover.
- Continue showing the blue download arrow and **Update** label when a newer release is available.

## Wiki

- Open Wiki pages in rendered preview mode by default.
- Use the explicit **Edit** action to enter the Markdown editor.

## Persistence

- Write workspace configuration atomically and keep a recovery backup.
- Recover saved repository details—including Gitea URLs—from the backup if an updater restart interrupts a settings write.
