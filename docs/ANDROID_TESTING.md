# Meshline Android Testing

The current proven Android base is **Meshline 1.0.7**. It is already installed and working on the Xiaomi and Windows emulator. Keep that installation: it supports the matching `production-apk` in-app update line and does not need to be replaced to receive compatible interface and JavaScript improvements.

> Do not install either published 1.0.8 test APK on a device with the working 1.0.7 app. Xiaomi rejected those new packages, so they are not the approved update path.

## Safe path for the current phone and emulator

Open the existing Meshline 1.0.7 application on each device. In **Network → App updates**, choose **Check for updates**. When a compatible update is shown, choose **Download update** and then **Restart to apply**. The latest published compatible update is on runtime 1.0.7, so this preserves the established app base and local data.

The in-app update flow is user-controlled rather than an invisible background update. A new APK is only needed for a native Android change or a runtime-version change, and any future replacement APK must first be tested against the Xiaomi installer.

## Proven 1.0.7 universal recovery APK

For a **new device** or a deliberately reset test device, the exact known-working 1.0.7 build is published in the [proven base release](https://github.com/najibjom/meshline/releases/tag/v1.0.7-proven-base). It contains all three native architectures needed by the current testing setup.

| Test device | Proven file | Included native architecture |
|---|---|---|
| Xiaomi or other Android phone | `Meshline-1.0.7-proven-universal.apk` | `armeabi-v7a`, `arm64-v8a` |
| Android Studio Pixel emulator on Windows | `Meshline-1.0.7-proven-universal.apk` | `x86_64` |

Do **not** use this recovery file to replace a working 1.0.7 installation: it has the same version as the installed app and provides no upgrade. Do not uninstall the working app simply to reinstall it, because Meshline keeps identity and message data locally.

## Two-device test checklist

1. Keep the existing 1.0.7 app installed on both the Xiaomi and Windows Pixel emulator.
2. Confirm the **Meshline connected** banner on both devices.
3. Add the other account by `@username`, send plain test text in each direction, and reopen one device after it was closed to check queued delivery.
4. For groups or channels, use an owner account to change a title, membership, or group posting setting, then reopen the other device to check the experimental encrypted synchronization.

## Current security boundary

Meshline currently provides an **experimental encrypted relay proof** for text messages. Direct messages and cross-device space fanout are not a production E2EE protocol, are not fully decentralized, and should only be used for testing. The relay stores opaque encrypted envelopes for delivery, but production work still requires stronger session setup, ratcheting, device verification, key lifecycle handling, and independent security review.

## Release integrity

| File | SHA-256 |
|---|---|
| `Meshline-1.0.7-proven-universal.apk` | `e36e4b77d5b18f465ffd95aeeeab3030c497ea3f7c0d8e0e82b3d513ee8f11ee` |
