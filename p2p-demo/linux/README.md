# Oracle Linux Relay Package

This package runs a deliberately **bounded, temporary libp2p Circuit Relay v2 experiment**. It is not a Meshline production service and stores no messages, usernames, channels, memberships, or plaintext.

## Contents

`meshline-relay` is the Linux **ARM64 (aarch64)** relay binary for Oracle Always Free Ampere A1 instances. `meshline-relay.service` starts it as an unprivileged `meshline` user, stores only its harness transport identity in `/var/lib/meshline-relay`, and applies small reservation and circuit limits. `install-relay.sh` verifies that a public IPv4 argument was supplied, installs the bounded service, and replaces `__PUBLIC_IPV4__` in the service file; it must be run as `sudo ./install-relay.sh <public-ipv4>`.

## Required public network rules

The Oracle VCN and the VM firewall must allow only the following inbound traffic for this experiment:

| Protocol | Port | Purpose |
| --- | --- | --- |
| TCP | 4020 | libp2p TCP relay transport |
| UDP | 4020 | libp2p QUIC relay transport |

SSH must be restricted to the operator's temporary source IP while the VM is configured. It must not be opened to the whole internet.

## Installation boundary

The package is intended only for an Oracle Linux 9 ARM64 VM. Before installation, verify the published package SHA-256, ensure the Oracle VCN rule and the VM firewall each allow **only** TCP/UDP 4020 publicly, and ensure that SSH is either source-restricted or avoided through Oracle Cloud Shell. The installer neither opens firewall ports nor creates public cloud security rules.

## End of experiment

Stop and disable the service, remove the two 4020 firewall rules, and delete the temporary VM. The relay's generated transport identity is not a Meshline account key and should be deleted with the VM.
