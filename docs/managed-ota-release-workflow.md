# Managed Meshline Over-the-Air Releases

## Outcome

Meshline is configured with an Expo managed-update project, a compatible runtime policy, and separate `preview` and `production` channels. A compatible update can replace the JavaScript and bundled assets inside an update-enabled installed APK without removing local Meshline data.

## One-time transition

The APK already installed on the phone cannot gain update support retroactively. Create and install **one new update-enabled Meshline Android build** in both Xiaomi Spaces. The normal managed Publish flow is required for that one native build because it embeds the update client, update URL, runtime version, and channel information.

## Everyday compatible release flow

For a compatible user-interface, text, or JavaScript-logic change, release to the `preview` channel first. Test the update from **Network → App updates** in both Xiaomi Spaces. Once confirmed, promote the compatible release to the `production` channel. The device downloads the update inside Meshline; the user chooses when to restart and apply it.

## When a new APK is still required

Create a new signed APK whenever a release changes the native Android runtime. Examples include adding a native library, changing Android permissions, upgrading the Expo or Android SDK, or changing native configuration. These updates must not be sent to old runtime versions.

## Safety rules

Always test in the preview channel before production. Keep release notes short and explicit. Never publish a JavaScript update that calls a native capability absent from the installed build. A compatible update preserves local app storage; uninstalling the app before installing a replacement may remove local Meshline data.
