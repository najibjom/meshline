#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-/home/ubuntu/android-sdk}"
AVD_NAME="${MESHLINE_TEST_AVD:-meshline-ota-test}"
APK_PATH="${1:?Usage: scripts/test-android-apk.sh /absolute/path/to/meshline.apk}"
ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR="$SDK_ROOT/emulator/emulator"
OUTPUT_DIR="${MESHLINE_ANDROID_TEST_OUTPUT:-/tmp/meshline-android-test}"
LOG_FILE="$OUTPUT_DIR/emulator.log"

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR/ui.xml" "$OUTPUT_DIR/screen.png" "$LOG_FILE"

cleanup() {
  "$ADB" emu kill >/dev/null 2>&1 || true
  wait "${EMULATOR_PID:-}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$EMULATOR" -avd "$AVD_NAME" -no-window -no-audio -no-boot-anim \
  -gpu swiftshader_indirect -accel off -memory 768 -no-snapshot -wipe-data \
  >"$LOG_FILE" 2>&1 &
EMULATOR_PID=$!

for _ in $(seq 1 84); do
  if "$ADB" devices | grep -q '^emulator-.*device$' && \
    [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    break
  fi
  sleep 5
done

if ! "$ADB" devices | grep -q '^emulator-.*device$'; then
  echo "Android emulator did not become ready. See $LOG_FILE" >&2
  exit 1
fi

"$ADB" install -r "$APK_PATH"
"$ADB" shell am start -W -a android.intent.action.VIEW \
  -d 'manusmeshlinemessenger:///app-updates' com.app.meshlinemessenger || true
sleep 10
"$ADB" shell uiautomator dump /sdcard/meshline-ui.xml >/dev/null
"$ADB" pull /sdcard/meshline-ui.xml "$OUTPUT_DIR/ui.xml" >/dev/null
"$ADB" exec-out screencap -p > "$OUTPUT_DIR/screen.png"

echo "Android runtime test artifacts: $OUTPUT_DIR"
grep -E 'Check for updates|Download update|Restart to apply|Already up to date' "$OUTPUT_DIR/ui.xml" || true
