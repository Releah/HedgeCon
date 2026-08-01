# HedgeCon v0.2.7-experimental.1

This experimental release improves monitor history and resizing, fixes an intermittent error while closing active connections, and prepares the release pipeline for SignPath Foundation code signing.

## Monitor history and layout

- Resize the Ping or TCP Monitor vertically by dragging its upper edge.
- Switch between Max, 4h, 1h, 30m, 5m and Live graph ranges.
- Calculate average latency from the selected time range while keeping current connection status visible.
- Retain bounded long-running history and reduce only the plotted points when necessary to keep the interface responsive.

## Reliable shutdown

- Close HedgeCon without an intermittent `Object has been destroyed` JavaScript error.
- Stop SSH connections and network monitors as window shutdown begins.
- Safely discard late SSH, host-key, monitor and updater events after the renderer closes.

## Code-signing preparation

- Publish HedgeCon's code-signing policy, privacy statement and release verification process.
- Add a SignPath Authenticode artifact configuration for the Windows installer and portable executable.
- Add a protected manual workflow for testing signed artifacts without altering a public release.
- Document the SignPath Foundation onboarding variables and secret required to activate signing.

The Windows binaries in this release remain unsigned while the SignPath Foundation application and certificate are pending.
