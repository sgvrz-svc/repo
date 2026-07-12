#!/bin/bash
set -e

IFACE=$(ip route show default | awk '/default/ {print $5; exit}')
GATEWAY=$(ip route show default | awk '/default/ {print $3; exit}')
LOCAL_IP=$(ip -4 addr show "$IFACE" | grep -oP '(?<=inet )\d+(\.\d+){3}')

echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-wg-forward.conf
sysctl -p /etc/sysctl.d/99-wg-forward.conf

echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | debconf-set-selections
echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | debconf-set-selections
apt-get update && apt-get install -y wireguard iptables-persistent

if ! grep -q "200 ssh_table" /etc/iproute2/rt_tables; then
    echo "200 ssh_table" >> /etc/iproute2/rt_tables
fi

ip route add default via "$GATEWAY" dev "$IFACE" table ssh_table || true
ip rule add from "$LOCAL_IP" table ssh_table || true

cat <<EOF > /etc/systemd/system/wg-ssh-route.service
[Unit]
Description=Maintain SSH routing table bypass for WireGuard
After=network.target
Before=wg-quick@wg0.service

[Service]
Type=oneshot
ExecStart=/sbin/ip route add default via $GATEWAY dev $IFACE table ssh_table ; /sbin/ip rule add from $LOCAL_IP table ssh_table
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wg-ssh-route.service
systemctl start wg-ssh-route.service

iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
iptables -A FORWARD -i wg0 -j ACCEPT
iptables -A FORWARD -o wg0 -j ACCEPT
iptables -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
iptables-save > /etc/iptables/rules.v4

systemctl enable --now wg-quick@wg0