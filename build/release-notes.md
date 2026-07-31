# HedgeCon v0.2.6-experimental.3

This experimental release polishes navigation and adds a more useful live connection monitor.

## Session navigation

- Open any session folder while terminal tabs remain connected.
- Browse and connect from the normal session-card library.
- Return to active terminals with a clear button showing the connected tab count.
- Open sessions selected from the library as new terminal tabs.

## Ping and TCP monitoring

- Keep the Monitor button visible while the panel is open so it can toggle closed.
- Use the shorter **Monitor** label in the terminal toolbar.
- Switch the live graph between ICMP Ping and TCP reachability.
- Probe the SSH port configured for the active session and graph TCP connection latency.
- Reset samples when changing mode so Ping and TCP measurements are not mixed.

## Wiki and credentials

- Reveal matching Wiki pages inside collapsed sections and nested folders while searching.
- Search Session Notes by session name and host address.
- Show a clear message when Wiki search has no results.
- Suggest existing shared credential profiles while still allowing new profile names.

This is an Experimental branch build and may contain unfinished behaviour.
