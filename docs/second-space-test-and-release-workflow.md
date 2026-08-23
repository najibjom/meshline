# Second Space Relay Test and Release Workflow

## Purpose

Use Xiaomi Second Space as a practical first check of Meshline’s direct-text proof. It provides a separate app-data environment, but it is not equivalent to two independently owned physical devices.

## Test sequence

1. Install the **same current Meshline APK** in the main Space and Second Space.
2. Create distinct local Meshline identities with different `@usernames`.
3. In both Spaces, sign in and open **Network → Encrypted text proof** once. This creates or loads the local transport key and registers only its public key with the development relay.
4. In the main Space, select **New contact**, enter the Second Space username, and choose **Find and start encrypted chat**.
5. If discovery succeeds, save the contact and send a direct text. The recipient client polls the relay and decrypts the opaque envelope locally.
6. If discovery fails, open the encrypted-text proof screen on the other Space again and confirm both installations are using the same current build and relay environment.

## APKs and updates

An installed APK is a frozen release artifact. A code change is not delivered to it automatically. For a new native APK, create a new project checkpoint and use the managed **Publish** flow to generate the next Android build; then install that release over the prior compatible release in each Space.

For fast development-only testing, use Expo Go with the active project QR code. It loads the current development bundle without producing a new APK, but it is not the final installation path and should not be treated as the production release channel.

## Important proof limits

This test verifies separate identities, relay registration, ciphertext delivery, and local decryption flow. It does not establish production E2EE, physical-device independence, verified key identity, forward secrecy, post-compromise recovery, or durable relay storage.
