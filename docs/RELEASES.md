# Meshline release guide

## Two different release types

| Release type | Use it for | User action |
|---|---|---|
| Compatible in-app update | JavaScript and interface changes that match the installed runtime line. | Open **Network → App updates**, then check, download, and restart. |
| APK replacement | A new native capability, a runtime mismatch, or a fresh device installation. | Install only a tested APK that matches the device. |

## APK safety rule

Never rebuild, rename, or replace a user-provided APK when the user has asked for that exact working file to be published. Upload the supplied binary unchanged and verify its SHA-256 digest after GitHub upload. A GitHub download filename can be normalized by the platform without changing the APK binary itself; disclose that clearly in the release note.

## Android testing release checklist

1. Verify the source with a clean TypeScript check and focused deterministic tests.
2. Confirm the intended runtime/update channel before publishing an in-app update.
3. For an APK, verify archive integrity, native architectures, package metadata, and the original binary digest.
4. Publish clear device-specific instructions and never tell a user to uninstall a working app before checking the update path.
5. Record the release, GitHub tag, and validation result in the project history.

## Current caution

The current Android test setup has known working user-provided phone and emulator APKs. Treat them as the baseline until a replacement build has been installed successfully on the target device. Do not describe an untested APK as a safe upgrade.
