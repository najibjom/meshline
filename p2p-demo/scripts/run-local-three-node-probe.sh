#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="$(mktemp -d)"
RELAY_PORT="${MESHLINE_LOCAL_RELAY_PORT:-4020}"
SECRET="${MESHLINE_DEMO_SECRET:-meshline-local-test-secret}"

cleanup() {
  [[ -n "${RELAY_PID:-}" ]] && kill "$RELAY_PID" 2>/dev/null || true
  [[ -n "${LISTENER_PID:-}" ]] && kill "$LISTENER_PID" 2>/dev/null || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

wait_for() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  for _ in $(seq 1 80); do
    if grep -q "$pattern" "$file" 2>/dev/null; then return 0; fi
    sleep 0.25
  done
  echo "FAIL: timed out waiting for $label" >&2
  cat "$file" >&2 || true
  exit 1
}

cd "$ROOT"
cargo build --quiet --bins

./target/debug/meshline-relay \
  --port "$RELAY_PORT" \
  --run-seconds 45 \
  --identity-file "$WORKDIR/relay.identity" \
  >"$WORKDIR/relay.log" 2>&1 &
RELAY_PID=$!
wait_for "$WORKDIR/relay.log" '^MESHLINE_RELAY_PEER ' 'relay identity'
RELAY_PEER="$(awk '/^MESHLINE_RELAY_PEER / { print $2; exit }' "$WORKDIR/relay.log")"
RELAY_ADDRESS="/ip4/127.0.0.1/tcp/${RELAY_PORT}/p2p/${RELAY_PEER}"

./target/debug/meshline-relay-client \
  --mode listener \
  --relay "$RELAY_ADDRESS" \
  --identity-file "$WORKDIR/listener.identity" \
  --demo-secret "$SECRET" \
  --run-seconds 40 \
  >"$WORKDIR/listener.log" 2>&1 &
LISTENER_PID=$!
wait_for "$WORKDIR/listener.log" '^RELAY_RESERVATION_ACCEPTED$' 'listener relay reservation'
LISTENER_PEER="$(awk '/^MESHLINE_RELAY_CLIENT_PEER / { print $2; exit }' "$WORKDIR/listener.log")"

./target/debug/meshline-relay-client \
  --mode dialer \
  --relay "$RELAY_ADDRESS" \
  --remote-peer "$LISTENER_PEER" \
  --identity-file "$WORKDIR/dialer.identity" \
  --demo-secret "$SECRET" \
  --send 'bounded local envelope' \
  --run-seconds 15 \
  >"$WORKDIR/dialer.log" 2>&1

wait_for "$WORKDIR/dialer.log" '^TRANSPORT_RELAY_CONNECTED ' 'relayed connection'
wait_for "$WORKDIR/dialer.log" '^P2P_DELIVERED ' 'delivery receipt'
wait_for "$WORKDIR/listener.log" '^P2P_ENVELOPE_AUTHENTICATED ' 'recipient envelope authentication'

printf '%s\n' 'LOCAL_THREE_NODE_PROBE_PASS'
printf '%s\n' '--- relay ---'
grep -E '^(MESHLINE_RELAY_PEER|RELAY_LIMITS|RELAY_EVENT)' "$WORKDIR/relay.log" || true
printf '%s\n' '--- listener ---'
grep -E '^(MESHLINE_RELAY_CLIENT_PEER|RELAY_RESERVATION|TRANSPORT_|DCUTR_|P2P_)' "$WORKDIR/listener.log" || true
printf '%s\n' '--- dialer ---'
grep -E '^(MESHLINE_RELAY_CLIENT_PEER|RELAY_CONNECTION|TRANSPORT_|DCUTR_|P2P_)' "$WORKDIR/dialer.log" || true
printf '%s\n' 'NOTE: This same-host proof validates the relayed text path. A DCUtR result here is not an internet NAT-traversal result.'
