#!/usr/bin/env bash
set -euo pipefail

TABLE_ID="100"
TABLE_NAME="wan"
MARK="1"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

WAN_IF=$(ip route | awk '/default via/ {print $5; exit}')
WAN_GW=$(ip route | awk '/default via/ {print $3; exit}')

if [[ -z "${WAN_IF:-}" || -z "${WAN_GW:-}" ]]; then
  echo "Cannot detect WAN interface or gateway"
  exit 1
fi

SSH_PORT=$(awk '
  BEGIN { port="" }
  /^[[:space:]]*Port[[:space:]]+/ {
    port=$2
    print port
    exit
  }
' /etc/ssh/sshd_config)

if [[ -z "${SSH_PORT:-}" ]]; then
  SSH_PORT="22"
fi

if ! grep -qE "^[[:space:]]*$TABLE_ID[[:space:]]+$TABLE_NAME$" /etc/iproute2/rt_tables; then
  echo "$TABLE_ID $TABLE_NAME" >> /etc/iproute2/rt_tables
fi

ip route replace default via "$WAN_GW" dev "$WAN_IF" table "$TABLE_NAME"
ip rule add fwmark "$MARK" lookup "$TABLE_NAME" 2>/dev/null || true
ip rule add pref 1000 fwmark "$MARK" lookup "$TABLE_NAME" 2>/dev/null || true

iptables -t mangle -C OUTPUT -p tcp --dport "$SSH_PORT" -j MARK --set-mark "$MARK" 2>/dev/null || \
iptables -t mangle -A OUTPUT -p tcp --dport "$SSH_PORT" -j MARK --set-mark "$MARK"

iptables -t mangle -C OUTPUT -p tcp --sport "$SSH_PORT" -j MARK --set-mark "$MARK" 2>/dev/null || \
iptables -t mangle -A OUTPUT -p tcp --sport "$SSH_PORT" -j MARK --set-mark "$MARK"

echo "Done."
echo "WAN interface: $WAN_IF"
echo "WAN gateway: $WAN_GW"
echo "SSH port: $SSH_PORT"
