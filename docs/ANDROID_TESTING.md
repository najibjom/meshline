# Meshline Android Testing

This release provides **two separate APK files** so the phone and Windows Android emulator can act as two independent Meshline devices. Download each file from the [latest GitHub release](https://github.com/najibjom/meshline/releases/latest), and install only the file intended for that device.

| Device | Download this file | Verified native architecture |
|---|---|---|
| Xiaomi or another Android phone | `Meshline-1.0.8-android-phone-arm32-arm64.apk` | `armeabi-v7a` and `arm64-v8a` |
| Android Studio Pixel emulator on Windows | `Meshline-1.0.8-windows-emulator-x86_64.apk` | `x86_64` |

> Do not install both files on the same device. They are two builds of the same Meshline application, intended for separate test devices.

## Install on an Android phone

Download the **phone** APK from the release page and open it from the Android Downloads notification or Files application. If Android asks for permission, allow the browser or Files application to install apps from that source, then choose **Install**. This APK is signed with the same Meshline Android identity and has a newer Android version code, so it should update an existing Meshline installation rather than create a second copy.

After opening Meshline, create or sign in to the phone’s test identity. Keep the phone identity separate from the emulator identity so the two devices can find and message each other by username.

## Install on the Windows Android emulator

Download the **Windows emulator** APK from the same release page to the Windows computer. Start the x86_64 Pixel emulator in Android Studio, then drag the downloaded APK from Windows File Explorer directly onto the running emulator window. Android Studio installs it and Meshline appears in the app drawer when installation finishes.

Open Meshline on the emulator and create or sign in to a second test identity. Search for the phone account by `@username`, then begin a direct text conversation. The phone and emulator must each open Meshline at least once with internet access so they can register with the experimental relay.

## Updates after installation

This release uses Meshline’s **production-apk** update channel. For ordinary interface and JavaScript changes, a new APK should not be necessary. In Meshline, open **Network → App updates**, then choose **Check for updates**. When an update is available, choose **Download update** and then **Restart to apply**.

The current in-app update flow is user-controlled rather than an invisible background update. Some future changes, such as a new Android native capability or a runtime-version change, can still require a new APK. Release notes will state that clearly.

## Two-device test checklist

1. Install the dual-ARM phone APK on the Xiaomi or other Android phone.
2. Install the x86_64 APK on the Windows Pixel emulator.
3. Create two different Meshline identities and confirm the **Meshline connected** banner on both devices.
4. Add the other account by `@username`, send plain test text in each direction, and reopen one device after it was closed to check queued delivery.
5. For groups or channels, use an owner account to change a title, membership, or group posting setting, then reopen the other device to check the experimental encrypted synchronization.

## Current security boundary

Meshline currently provides an **experimental encrypted relay proof** for text messages. Direct messages and cross-device space fanout are not a production E2EE protocol, are not fully decentralized, and should only be used for testing. The relay stores opaque encrypted envelopes for delivery, but production work still requires stronger session setup, ratcheting, device verification, key lifecycle handling, and independent security review.

## Release integrity

| File | SHA-256 |
|---|---|
| `Meshline-1.0.8-android-phone-arm32-arm64.apk` | `82e7ed2e1c1507ab9ded746687ef134218c94454f71e4890583128e9994f4068` |
| `Meshline-1.0.8-windows-emulator-x86_64.apk` | `24000dbad9316cd8cf88817b50bc3a8f16f71881349ce24735ad2af6770446cc` |
