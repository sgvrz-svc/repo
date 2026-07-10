#!/bin/bash
set -e

WG_IF="wg0"
AMZ_IF="awg0"
TABLE="100"
MARK="0x1"
EXT_IF=$(ip route show default | awk '/default/ {print $5; exit}')

apt update
apt install -y wireguard nftables

cp ./outbound.conf /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf

sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-forward.conf

cat > /etc/systemd/system/wg-policy.service <<EOF
[Unit]
After=network-online.target wg-quick@wg0.service
Wants=network-online.target
Requires=wg-quick@wg0.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'ip route replace default dev $WG_IF table $TABLE; ip rule add fwmark $MARK table $TABLE 2>/dev/null || true'
ExecStop=/bin/sh -c 'ip rule del fwmark $MARK table $TABLE 2>/dev/null || true; ip route del default dev $WG_IF table $TABLE 2>/dev/null || true'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/nftables-wg.service <<EOF
[Unit]
After=wg-quick@wg0.service wg-policy.service
Requires=wg-quick@wg0.service wg-policy.service

[Service]
Type=oneshot
ExecStart=/usr/sbin/nft -f /etc/nftables.conf
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nftables.conf <<EOF
flush ruleset

table inet filter {
  chain forward {
    type filter hook forward priority 0; policy accept;
    iifname "$AMZ_IF" oifname "$WG_IF" accept
    iifname "$WG_IF" oifname "$AMZ_IF" ct state established,related accept
  }
}

table ip nat {
  chain postrouting {
    type nat hook postrouting priority 100; policy accept;
    oifname "$WG_IF" masquerade
    oifname "$EXT_IF" masquerade
  }
}
EOF

systemctl daemon-reload
systemctl enable --now wg-quick@wg0
systemctl enable --now wg-policy.service
systemctl enable --now nftables-wg.service
