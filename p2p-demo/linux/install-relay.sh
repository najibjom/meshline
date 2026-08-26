#!/usr/bin/env bash
set -euo pipefail

public_ipv4="${1:-}"

if [[ ! "${public_ipv4}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "Usage: sudo ./install-relay.sh <public-ipv4>" >&2
  exit 64
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 77
fi

if ! id -u meshline >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/meshline-relay --shell /usr/sbin/nologin meshline
fi
install -d -o meshline -g meshline -m 0750 /opt/meshline-relay /var/lib/meshline-relay

install -o root -g root -m 0755 ./meshline-relay /opt/meshline-relay/meshline-relay
sed "s/__PUBLIC_IPV4__/${public_ipv4}/g" ./meshline-relay.service >/etc/systemd/system/meshline-relay.service
systemctl daemon-reload
systemctl enable --now meshline-relay.service
systemctl --no-pager --full status meshline-relay.service
