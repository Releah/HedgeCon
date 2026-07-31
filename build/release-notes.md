# HedgeCon v0.2.6-experimental.2

This experimental release completes the first multi-user Git workflow for shared Wiki and inventory data.

## Multi-user Git safety

- Check the server before every push.
- Automatically fast-forward or merge compatible changes.
- Stop safely when multiple people edit the same content.
- Resolve conflicts by keeping the local version, keeping the server version, or editing the combined result.
- Preserve both histories with a proper merge commit and never force-push.
- Use the same guarded Sync & push flow for the Wiki and inventory YAML.

## Private credential profiles

- Share neutral profile names such as `network-admin` in inventory YAML.
- Map each profile to a different local credential set for every member of staff.
- Keep usernames, passwords, authentication methods, and private-key paths out of newly generated shared YAML.
- Inherit profiles through YAML groups or override them on individual hosts.
- Highlight profiles that still need a local mapping.
- Continue importing the previous `hedgecon_credential_set` format for compatibility.

## Wiki navigation

- Collapse General Notes, Vendor Notes, Session Notes, and nested folders.
- Remember collapsed state and sidebar width between application sessions.
- Resize the Wiki navigation panel with a draggable divider.
- Move Session Notes below General and Vendor notes.
- Use a quieter sidebar with compact page metadata and creation controls.

## Interface fixes

- Keep Wiki Git buttons at a stable size while status messages change.
- Close the terminal colour palette after choosing a colour or moving the pointer away.

This is an Experimental branch build and may contain unfinished behaviour.
