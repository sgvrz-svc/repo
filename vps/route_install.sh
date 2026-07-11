#!/bin/bash
set -e

CONF_SRC="$1"

echo "[1/7] Определение интерфейсов и подсетей"
EXT_IF=$(ip route show default | awk '{print $5; exit}')
AWG_IF=$(ip -o link show type amneziawg | awk -F': ' '{print $2}' | cut -d'@' -f1 | head -n1)
AWG_SUBNET=$(ip -o -4 route show dev "$AWG_IF" scope link | awk '{print $1; exit}')
OUTBOUND_IF="outbound_wg"
echo "EXT_IF=$EXT_IF AWG_IF=$AWG_IF AWG_SUBNET=$AWG_SUBNET OUTBOUND_IF=$OUTBOUND_IF"

echo "[2/7] Установка wireguard-tools"
apt-get update -qq
apt-get install -y -qq wireguard-tools

echo "[3/7] Подготовка /etc/wireguard/${OUTBOUND_IF}.conf"
cp "$CONF_SRC" /etc/wireguard/${OUTBOUND_IF}.conf
chmod 600 /etc/wireguard/${OUTBOUND_IF}.conf
sed -i '/^DNS/d' /etc/wireguard/${OUTBOUND_IF}.conf

INSERT="Table = 200
PostUp = ip rule add from $AWG_SUBNET table 200
PostUp = iptables -t nat -A POSTROUTING -s $AWG_SUBNET -o $OUTBOUND_IF -j MASQUERADE
PostUp = iptables -A FORWARD -i $AWG_IF -o $OUTBOUND_IF -j ACCEPT
PostUp = iptables -A FORWARD -i $OUTBOUND_IF -o $AWG_IF -m state --state ESTABLISHED,RELATED -j ACCEPT
PreDown = ip rule delete from $AWG_SUBNET table 200
PreDown = iptables -t nat -D POSTROUTING -s $AWG_SUBNET -o $OUTBOUND_IF -j MASQUERADE
PreDown = iptables -D FORWARD -i $AWG_IF -o $OUTBOUND_IF -j ACCEPT
PreDown = iptables -D FORWARD -i $OUTBOUND_IF -o $AWG_IF -m state --state ESTABLISHED,RELATED -j ACCEPT"

awk -v ins="$INSERT" '/^\[Interface\]/{print; print ins; next} 1' /etc/wireguard/${OUTBOUND_IF}.conf > /etc/wireguard/${OUTBOUND_IF}.conf.new
mv /etc/wireguard/${OUTBOUND_IF}.conf.new /etc/wireguard/${OUTBOUND_IF}.conf

echo "[4/7] Включение IP forwarding"
sysctl -w net.ipv4.ip_forward=1 >/dev/null
grep -q '^net.ipv4.ip_forward=1' /etc/sysctl.conf || echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf

echo "[5/7] Поднятие $OUTBOUND_IF"
wg-quick up "$OUTBOUND_IF"

echo "[6/7] Включение автозапуска"
systemctl enable wg-quick@"$OUTBOUND_IF" >/dev/null
systemctl enable awg-quick@"$AWG_IF" >/dev/null 2>&1 || true

echo "[7/7] Готово"
wg show "$OUTBOUND_IF"
ip rule show