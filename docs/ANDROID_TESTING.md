# Meshline Android Testing

The current working Android setup uses the **exact APK files supplied by the project owner** for the Xiaomi phone and Windows Android emulator. Keep a working installation in place: it supports the matching `production-apk` in-app update line and does not need to be replaced to receive compatible interface and JavaScript improvements.

> Do not install either published 1.0.8 test APK on a device with the working 1.0.7 app. Xiaomi rejected those new packages, so they are not the approved update path.

## Safe path for the current phone and emulator

Open the existing Meshline 1.0.7 application on each device. In **Network → App updates**, choose **Check for updates**. When a compatible update is shown, choose **Download update** and then **Restart to apply**. The latest published compatible update is on runtime 1.0.7, so this preserves the established app base and local data.

The in-app update flow is user-controlled rather than an invisible background update. A new APK is only needed for a native Android change or a runtime-version change, and any future replacement APK must first be tested against the Xiaomi installer.

## Exact working APK files

For a **new device** or a deliberately reset test device, download only the exact owner-provided file that previously worked on that device from the [working APK release](https://github.com/najibjom/meshline/releases/tag/user-provided-working-apks). The APK binaries were uploaded unchanged.

| Test device | Exact file | Direct download |
|---|---|---|
| Xiaomi Android phone | `meshline-1.0.7.apk` | [Download phone file](https://github.com/najibjom/meshline/releases/download/user-provided-working-apks/meshline-1.0.7.apk) |
| Windows Android emulator | `meshline-1.0.8.1.apk` | [Download emulator file](https://github.com/najibjom/meshline/releases/download/user-provided-working-apks/meshline-1.0.8.1.apk) |

GitHub normalizes the parentheses in the emulator file’s original filename, so it displays the download as `meshline-1.0.8.1.apk`. The APK binary itself is unchanged. Do **not** uninstall a working Meshline app simply to reinstall it, because Meshline keeps identity and message data locally.

## Additional 1.0.9 test packages

The [Meshline 1.0.9 Android test release](https://github.com/najibjom/meshline/releases/tag/v1.0.9-android-test) adds separate signed packages containing the approved launcher branding, keyboard-safe message composer, Profile control inset, and current dark-navy interface. It **does not** remove or replace any earlier release asset.

| Test device | File | CPU libraries | SHA-256 |
|---|---|---|---|
| Xiaomi Android phone | `meshline-1.0.9-phone.apk` | `armeabi-v7a`, `arm64-v8a` | `ed5782e4367164f428f81141e474f4a04f165283498e30fd5a278c964c25e9c1` |
| Windows Android emulator | `meshline-1.0.9-emulator.apk` | `x86_64` | `3834ee1456b70734a12bbcb86b0dfcdbf3803907acc2fb5bad10aa043d700081` |

The two archive structures and CPU libraries were verified before upload. Xiaomi installation remains a physical-device check; keep the proven 1.0.7 installation in place unless the owner deliberately chooses to test the new package.

## Two-device test checklist

1. Keep the working app installed on both the Xiaomi and Windows Pixel emulator.
2. Confirm the **Meshline connected** banner on both devices.
3. Add the other account by `@username`, send plain test text in each direction, and reopen one device after it was closed to check queued delivery.
4. Force-stop one device, send a plain test message from the other, then reopen the stopped device and confirm the message appears once.
5. For a group or channel, use an owner account to change a title, membership, or group posting setting, then reopen the other device to check the experimental encrypted synchronization.
6. If any step fails, record the device, app file, visible connection status, and exact error without sharing private message text, password material, recovery codes, or transport keys.

## Current security boundary

Meshline currently provides an **experimental encrypted relay proof** for text messages. Direct messages and cross-device space fanout are not a production E2EE protocol, are not fully decentralized, and should only be used for testing. The relay stores opaque encrypted envelopes for delivery, but production work still requires stronger session setup, ratcheting, device verification, key lifecycle handling, and independent security review.

## Release integrity

| File | SHA-256 |
|---|---|
| `meshline-1.0.7.apk` (phone) | `8e93c76ed5f0a98193aae809ed8b20923014b09b6136d28568ce170606153155` |
| `meshline-1.0.8.1.apk` (emulator; GitHub-normalized filename) | `0892fc207f04a02c57979597660afcc14ed6a7f74621bacde22ff83e00b7aade` |
