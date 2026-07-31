# HedgeCon v0.2.6

This stable release adds collaborative Git workflows, private credential profiles, improved Wiki organisation, and expanded terminal tooling.

## Multi-user Git collaboration

- Check the server before every push and automatically merge compatible changes.
- Resolve same-file conflicts by keeping the local version, keeping the server version, or editing the combined result.
- Preserve both users' histories with proper merge commits and never force-push.
- Use guarded synchronization for both Wiki content and inventory YAML.
- Test saved Gitea or GitHub connection details directly from Settings.

## Shared inventory with private credentials

- Share neutral roles such as `network-admin` instead of personal authentication details.
- Map each shared profile to a different local credential set for every user.
- Keep usernames, passwords, authentication methods, and private-key paths out of newly generated inventory YAML.
- Highlight profiles that require a local mapping and suggest profiles already in use.
- Continue importing the previous credential-set format for compatibility.

## Wiki organisation

- Organise General and Vendor notes in nested folders and drag pages between them.
- Keep Session Notes in a dedicated section below the other notes.
- Collapse sections and folders with state remembered between application sessions.
- Resize the Wiki sidebar and retain its width.
- Search through collapsed folders and Session Notes with clear no-result feedback.
- See clearer progress, commit IDs, and errors for Git actions.

## Sessions and terminal tools

- Browse session folders while active terminal tabs remain connected.
- Return to active sessions using a clear workspace control.
- Open a selected library session as a new terminal tab.
- Switch the live connection monitor between ICMP Ping and TCP checks against the configured SSH port.
- Keep the Monitor button visible so it can toggle the panel closed.
- Use stable Git action sizing and improved terminal colour-menu behaviour.
