#!/usr/bin/env bash
set -euo pipefail

SRC_CONF="/root/outbound.conf"
WG_CONF="/etc/wireguard/wg0.conf"
POSTUP_SH="/etc/wireguard/wg0-postup.sh"
POSTDOWN_SH="/etc/wireguard/wg0-postdown.sh"
FWMARK="0x1"
RT_TABLE_NUM="100"
RT_TABLE_NAME="wg-ssh-bypass"

SSH_PORT="${1:-}"
if [[ -z "$SSH_PORT" ]]; then
    SSH_PORT="$(grep -iE '^\s*Port\s+[0-9]+' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' | head -n1 || true)"
    SSH_PORT="${SSH_PORT:-22}"
fi

DEFAULT_ROUTE="$(ip -4 route show default | head -n1)"
ORIG_GW="$(awk '{for(i=1;i<=NF;i++) if ($i=="via") print $(i+1)}' <<< "$DEFAULT_ROUTE")"
ORIG_IF="$(awk '{for(i=1;i<=NF;i++) if ($i=="dev") print $(i+1)}' <<< "$DEFAULT_ROUTE")"

apt-get update -y
apt-get install -y wireguard wireguard-tools iptables iproute2

grep -qE "^[0-9]+[[:space:]]+$RT_TABLE_NAME\$" /etc/iproute2/rt_tables 2>/dev/null || echo "$RT_TABLE_NUM $RT_TABLE_NAME" >> /etc/iproute2/rt_tables

install -m 600 "$SRC_CONF" "$WG_CONF"

sed -i '/^PostUp\s*=/d; /^PostDown\s*=/d' "$WG_CONF"

cat > "$POSTUP_SH" <<EOF
#!/usr/bin/env bash
iptables -t mangle -A OUTPUT -p tcp --sport $SSH_PORT -j MARK --set-mark $FWMARK
ip rule add fwmark $FWMARK table $RT_TABLE_NAME priority 100
ip route replace default via $ORIG_GW dev $ORIG_IF table $RT_TABLE_NAME
EOF
chmod 700 "$POSTUP_SH"

cat > "$POSTDOWN_SH" <<EOF
#!/usr/bin/env bash
iptables -t mangle -D OUTPUT -p tcp --sport $SSH_PORT -j MARK --set-mark $FWMARK || true
ip rule del fwmark $FWMARK table $RT_TABLE_NAME priority 100 || true
ip route flush table $RT_TABLE_NAME || true
EOF
chmod 700 "$POSTDOWN_SH"

sed -i "/^\[Interface\]/a PostUp = $POSTUP_SH\nPostDown = $POSTDOWN_SH" "$WG_CONF"

chmod 600 "$WG_CONF"

sed -i '/^net.ipv4.ip_forward/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p >/dev/null

systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0