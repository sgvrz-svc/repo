#!/bin/bash
set -e
IFACE=$(ip route show default | awk '/default/ {print $5; exit}')
cp "$1" /etc/wireguard/wg0.conf
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-wg-forward.conf
sysctl -p /etc/sysctl.d/99-wg-forward.conf
echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | debconf-set-selections
echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | debconf-set-selections
apt-get update && apt-get install -y wireguard iptables-persistent
iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
iptables -A FORWARD -i wg0 -j ACCEPT
iptables -A FORWARD -o wg0 -j ACCEPT
iptables -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
iptables-save > /etc/iptables/rules.v4
systemctl enable --now wg-quick@wg0