# Testing Meshline with a Windows Android Emulator

This guide turns a Windows computer into a **second, separate Meshline device**. The emulator has its own storage and account, so it can test messaging with the Meshline account on your phone. It is not the browser preview and does not use Expo Go.

> **Important:** This tests the present experimental encrypted-relay proof. Keep Meshline open on both the phone and the emulator while testing. Reliable background delivery and durable offline queues are not finished yet.

## What you need

| Item | Why it is needed |
|---|---|
| A Windows 10 or Windows 11 computer, 64-bit | Android Studio’s emulator runs on Windows. |
| Preferably 16 GB RAM and 16 GB free disk space | This is Android’s recommended baseline for a smooth emulator experience. [1] |
| Android Studio | It includes the Android Emulator. [1] |
| The **Meshline 1.0.7 APK** you originally installed | This creates the same update-capable Meshline base on the emulator. |
| A second Meshline username | The emulator must not reuse the phone account’s username. |

## Part 1 — Prepare Windows

1. Press `Ctrl + Shift + Esc` to open **Task Manager**.
2. Choose **Performance** → **CPU**.
3. Find the line called **Virtualization**.

| What you see | What to do |
|---|---|
| `Enabled` | Continue to Part 2. |
| `Disabled` | Restart the computer, enter its BIOS/UEFI setup, and enable **Intel Virtualization Technology**, **VT-x**, **SVM**, or **AMD-V**. The exact key and wording depend on the computer maker. |

If the emulator later reports that acceleration is unavailable, open Windows search, type **Turn Windows features on or off**, enable **Windows Hypervisor Platform**, confirm, and restart Windows. Google recommends this Windows acceleration route. [3]

## Part 2 — Install Android Studio

1. Go to [Android Studio’s official download page](https://developer.android.com/studio).
2. Download the **Windows** installer and run it.
3. Choose the normal **Standard** installation when asked.
4. Leave the emulator component selected. No Google account is required to create the emulator or install Meshline.
5. Finish installation and open Android Studio.

## Part 3 — Create the virtual Android phone

1. On the Android Studio welcome screen, choose **More Actions** → **Virtual Device Manager**.
2. Click **Create Device**.
3. Select a normal phone profile, such as **Pixel 6** or **Pixel 7**, then click **Next**.
4. In **System Image**, select a recommended **x86_64** image. A current Android version is fine; Meshline supports Android versions well below current emulator images.
5. If a download icon appears beside the image, click it, accept the license, and wait for the image to download.
6. Click **Next**. Keep the default name, then click **Show Advanced Settings**.
7. Set **Graphics** to **Automatic**. Leave **Boot option** as **Quick Boot**.
8. Click **Finish**.
9. In Device Manager, click the triangle **Play** button beside the new device. The first boot can take a few minutes.

Android Studio’s Device Manager is the official place to create, start, stop, and reset virtual devices. Each virtual device has its own private storage, settings, and installed apps—exactly what is needed for a separate test account. [1] [2]

## Part 4 — Install Meshline in the emulator

1. Find the **same Meshline 1.0.7 APK** that you originally installed on your phone. If it is only on the phone, transfer it to Windows using a method you trust, such as USB cable, cloud storage, or email to yourself.
2. With the emulator running, drag the APK file from Windows directly onto the emulator window.
3. Wait for the **App installed** message.
4. Open **Meshline** from the emulator’s app list.
5. If Meshline asks for an update, use **Network → App updates → Check for updates → Download update → Restart to apply**. This gives the emulator the same current Meshline interface as the phone without building another APK.

> Do **not** use Expo Go for this test. Install the Meshline APK itself so the emulator behaves like a second installed device.

## Part 5 — Create the second Meshline account

1. In the emulator, choose **Create account**.
2. Use a different name and a different `@username` from the one on your phone. For example, if the phone uses `@nomad`, use something like `@nomad_test` in the emulator.
3. Complete the local account setup and keep the recovery information private.
4. Open the **Chats** tab. Wait until the top banner says **Meshline connected**.
5. Leave Meshline open in the foreground on the emulator for the first test.

## Part 6 — Test both directions

1. On the **phone**, create or open a direct chat with the emulator’s `@username`.
2. On the **emulator**, create or open a direct chat with the phone account’s `@username`.
3. Keep both Meshline apps open and make sure both top banners say **Meshline connected**.
4. Send a short text from the phone to the emulator, such as `phone to emulator test`.
5. Send a different short text from the emulator to the phone, such as `emulator to phone test`.
6. Take a screenshot of both message states if either one says **Not sent** or **Recipient needs to connect to Meshline**.

## What the results mean today

| Result | Meaning | Next action |
|---|---|---|
| The message arrives in both directions | The two-client relay proof worked for this test. | Keep the screenshots as the first real two-device test record. |
| `Recipient needs to connect to Meshline` | The receiving account has not registered with the current relay session. | Open Meshline on the receiving device, wait for **Meshline connected**, then try again. |
| `Not sent` | The current experimental relay could not queue the direct message. | Keep both apps open, confirm both banners are connected, then send the exact status text or screenshot. |
| The emulator is very slow | Windows virtualization or graphics acceleration is not working. | Enable **Windows Hypervisor Platform**, restart Windows, then use the x86_64 image and Graphics: Automatic. |
| You want a completely fresh second device | The emulator still has the old local account data. | In Device Manager, use the device menu → **Wipe Data**. This erases only the emulator, not the phone. [1] |

## What not to expect yet

The current Meshline relay is a **proof of concept**, not a production messaging network. The recipient registration is still temporary and the app does not yet offer durable offline delivery or background notification delivery. For this particular test, the reliable setup is to leave both apps open and connected.

## References

[1]: https://developer.android.com/studio/run/emulator "Run apps on the Android Emulator — Android Developers"
[2]: https://developer.android.com/studio/run/managing-avds "Create and manage virtual devices — Android Developers"
[3]: https://developer.android.com/studio/run/emulator-acceleration "Configure hardware acceleration for the Android Emulator — Android Developers"
