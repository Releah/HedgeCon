# HedgeCon code signing and release process

## Policy

**Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).**

- Repository: <https://github.com/Releah/HedgeCon>
- Committer and reviewer: [@Releah](https://github.com/Releah)
- Signing approver: [@Releah](https://github.com/Releah)
- Release source: a version tag whose value matches `package.json`
- Build system: GitHub-hosted GitHub Actions runners
- Signing scope: HedgeCon's Windows installer and portable executable

Release signing requests require manual approval in SignPath. The SignPath certificate must only be used for artifacts produced by the repository's tagged release workflow. Third-party binaries bundled by Electron must not be presented as independently authored HedgeCon binaries.

## Privacy

HedgeCon does not include advertising or telemetry. It communicates with networked systems only for a configured or user-initiated operation:

- SSH, SFTP, SCP, ping and TCP monitoring connect to hosts selected by the user.
- Git features connect to a repository configured by the user.
- Update checks connect to the public `Releah/HedgeCon` GitHub Releases feed. Automatic checks can be disabled in the application settings.
- External links are opened only when selected by the user.

Credentials, private keys, terminal contents, session data and Wiki contents are not sent to HedgeCon, SignPath or an analytics service. Git credentials and SSH authentication material are sent only to the server the user configures, as required to authenticate that operation.

## SignPath onboarding

Before enabling signing:

1. Apply for a SignPath Foundation open-source subscription for `Releah/HedgeCon`.
2. Enable multi-factor authentication for the GitHub and SignPath accounts involved in releases.
3. Install the SignPath GitHub App for this repository if requested during onboarding.
4. Create a SignPath project and an Authenticode signing policy that requires manual approval.
5. Import `.signpath/artifact-configuration.xml` as the project's artifact configuration.
6. Add these GitHub repository variables:
   - `SIGNPATH_ORGANIZATION_ID`
   - `SIGNPATH_PROJECT_SLUG`
   - `SIGNPATH_SIGNING_POLICY_SLUG`
   - `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG`
7. Add `SIGNPATH_API_TOKEN` as a GitHub Actions repository secret. Never place it in source control.
8. Run the **Test SignPath Windows signing** workflow manually and approve its signing request.
9. Download the resulting `hedgecon-windows-signed` artifact and verify both executables before enabling signed release publication.

The manual test workflow deliberately does not create or modify a GitHub Release. Integration into `.github/workflows/release.yml` should happen only after the test succeeds, because signing changes the executable hashes. Updater metadata and blockmaps must be produced from the final signed installer.

## Verification

On Windows, inspect each returned executable with PowerShell:

```powershell
Get-AuthenticodeSignature .\HedgeCon-Setup.exe | Format-List Status,StatusMessage,SignerCertificate
Get-AuthenticodeSignature .\HedgeCon.exe | Format-List Status,StatusMessage,SignerCertificate
```

Both statuses must be `Valid`, and the signer certificate must identify SignPath Foundation. Also install and launch the signed installer on a clean test machine before changing the tagged release pipeline.
