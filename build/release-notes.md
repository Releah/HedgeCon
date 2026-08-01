# HedgeCon v0.2.7-experimental.2

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
