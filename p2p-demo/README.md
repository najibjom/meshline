# Meshline P2P Transport Experiment

> **Experimental developer proof only.** This harness does not alter the installed Meshline app, replace the durable HTTPS relay, create a decentralized network, or establish a production encryption protocol.

## What Is Implemented

The harness provides a bounded Circuit Relay v2 role, a reserving private peer, and a dialing private peer. Relay use is transparent: all peers know the route includes the relay. The relay persists only its own harness identity and stores **no** Meshline messages, account records, channels, groups, membership, or plaintext. Test text travels in an authenticated envelope and produces a receipt. Direct Connection Upgrade through Relay (DCUtR) is attempted, but a failed upgrade leaves the relayed route available for the test envelope.

The included offline-object fixture remains a separate deterministic model. It checks expiry, object/manifest binding, replica limits from one through five, duplicate assignments, and repair need. It does not yet replicate, store, or retrieve objects across the network.

## Windows Temporary Relay

The Windows package contains `meshline-relay.exe` and `Start-MeshlineRelay.ps1`. It is intended only for a limited test window.

1. Unzip the package to a normal folder such as `C:\MeshlineRelay`.
2. Open **PowerShell as Administrator**, then allow incoming TCP and UDP traffic on port 4020:

   ```powershell
   New-NetFirewallRule -DisplayName "Meshline temporary relay TCP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4020
   New-NetFirewallRule -DisplayName "Meshline temporary relay UDP" -Direction Inbound -Action Allow -Protocol UDP -LocalPort 4020
   ```

3. In the home-router settings, forward both **TCP 4020** and **UDP 4020** to the Windows computer’s local IPv4 address. Find that address with `ipconfig`; use the IPv4 address shown for the active Wi-Fi or Ethernet connection.
4. In the extracted folder, run `Start-MeshlineRelay.ps1`. Windows may request a network-permission confirmation; allow it only for the selected test network.
5. Send only the printed `MESHLINE_RELAY_PEER` line and the public IP address to the test coordinator. **Never send** `relay.identity`, its contents, passwords, recovery codes, or a screenshot containing unrelated system details.

The coordinator combines those two safe values into a relay address like this:

```text
/ip4/PUBLIC_IP/tcp/4020/p2p/RELAY_PEER_ID
```

## Local Validation

Run the deterministic local three-process proof on a Rust development machine:

```bash
cd p2p-demo
MESHLINE_DEMO_SECRET='temporary-test-secret' ./scripts/run-local-three-node-probe.sh
```

Success requires `LOCAL_THREE_NODE_PROBE_PASS`, a listener reservation, a relayed transport connection, recipient envelope authentication, and a receipt. A same-host DCUtR result is not evidence about internet NAT traversal.

## Current Limits

This is not mobile-integrated: an Android Meshline app cannot yet participate as a Rust/libp2p peer. A full real-network test therefore needs the Windows relay plus two separate machines or networks running the temporary peer harness. The present HTTPS relay remains the only durable offline fallback for the shipped app.
