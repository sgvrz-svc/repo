set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Проверки
# ---------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    echo "Запустите скрипт от root (sudo)." >&2
    exit 1
fi

if [[ $# -lt 1 || ! -f "$1" ]]; then
    echo "Использование: $0 /path/to/wg-client.conf" >&2
    echo "Файл должен быть обычным wg-quick конфигом клиента (без Table=off и PostUp/PostDown — их добавит скрипт сам)." >&2
    exit 1
fi

SRC_WG_CONF="$1"
SSH_PORT="$(awk '/^\s*Port\s+/{print $2; found=1} END{if(!found) print 22}' /etc/ssh/sshd_config 2>/dev/null | tail -n1)"
[[ -z "$SSH_PORT" ]] && SSH_PORT=22

echo "== Обнаружен SSH порт: $SSH_PORT (проверьте, если у вас нестандартный)"

# ---------------------------------------------------------------------------
# 1. Определяем текущий (оригинальный) интерфейс и шлюз ДО любых изменений
# ---------------------------------------------------------------------------
read -r MAIN_IFACE MAIN_GW <<<"$(ip -4 route show default | awk '{print $5, $3}' | head -n1)"

if [[ -z "${MAIN_IFACE:-}" || -z "${MAIN_GW:-}" ]]; then
    echo "Не удалось определить основной интерфейс/шлюз. Прервано." >&2
    exit 1
fi

echo "== Основной интерфейс: $MAIN_IFACE, шлюз: $MAIN_GW"

# ---------------------------------------------------------------------------
# 2. Пакеты
# ---------------------------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq wireguard wireguard-tools iptables iproute2 >/dev/null

# ---------------------------------------------------------------------------
# 3. Регистрируем таблицы маршрутизации (идемпотентно)
# ---------------------------------------------------------------------------
grep -q '^100[[:space:]]\+eth0table$' /etc/iproute2/rt_tables || echo "100 eth0table" >> /etc/iproute2/rt_tables
grep -q '^200[[:space:]]\+wg0table$'  /etc/iproute2/rt_tables || echo "200 wg0table"  >> /etc/iproute2/rt_tables

# ---------------------------------------------------------------------------
# 4. Конфиг для базового routing-скрипта, который выполняется при каждой
#    загрузке системы (до поднятия wg0)
# ---------------------------------------------------------------------------
install -d -m 755 /etc/vps-split-routing
cat > /etc/vps-split-routing/env <<EOF
MAIN_IFACE=$MAIN_IFACE
MAIN_GW=$MAIN_GW
SSH_PORT=$SSH_PORT
EOF

cat > /usr/local/sbin/vps-split-routing.sh <<'EOF'
#!/usr/bin/env bash
# Базовая policy-routing настройка. Выполняется при старте системы,
# ДО поднятия wg0. Идемпотентен.
set -euo pipefail
source /etc/vps-split-routing/env

# --- таблица 100: только для помеченного (SSH) трафика, через оригинальный шлюз
ip route replace default via "$MAIN_GW" dev "$MAIN_IFACE" table 100

# --- ip rule: сначала помеченный SSH-трафик -> table 100 (оригинальный шлюз)
ip rule del fwmark 0x1 table 100 2>/dev/null || true
ip rule add fwmark 0x1 table 100 priority 100

# --- затем весь остальной новый трафик -> table 200 (wg0, если поднят)
ip rule del table 200 2>/dev/null || true
ip rule add table 200 priority 200

# --- mangle: помечаем SSH-соединения (conntrack), чтобы ответы шли туда же
iptables -t mangle -N SSHMARK 2>/dev/null || true
iptables -t mangle -F SSHMARK
iptables -t mangle -A SSHMARK -p tcp --dport "$SSH_PORT" -m conntrack --ctstate NEW -j CONNMARK --set-mark 0x1
iptables -t mangle -A SSHMARK -j CONNMARK --restore-mark

iptables -t mangle -C PREROUTING -j SSHMARK 2>/dev/null || iptables -t mangle -A PREROUTING -j SSHMARK
iptables -t mangle -C OUTPUT -j CONNMARK --restore-mark 2>/dev/null || iptables -t mangle -A OUTPUT -j CONNMARK --restore-mark
EOF
chmod +x /usr/local/sbin/vps-split-routing.sh

cat > /etc/systemd/system/vps-split-routing.service <<'EOF'
[Unit]
Description=Base split-routing setup (SSH via original gateway)
After=network-online.target
Wants=network-online.target
Before=wg-quick@wg0.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/sbin/vps-split-routing.sh

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now vps-split-routing.service

# ---------------------------------------------------------------------------
# 5. IP forwarding (нужно и сейчас для будущего AmneziaWG)
# ---------------------------------------------------------------------------
if ! grep -q '^net.ipv4.ip_forward=1' /etc/sysctl.conf; then
    echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
fi
sysctl -w net.ipv4.ip_forward=1 >/dev/null

# ---------------------------------------------------------------------------
# 6. Собираем /etc/wireguard/wg0.conf на основе присланного клиентского конфига
# ---------------------------------------------------------------------------
install -d -m 700 /etc/wireguard
WG_CONF=/etc/wireguard/wg0.conf

# Убираем возможные старые Table/PostUp/PostDown из исходника, чтобы не задвоить
grep -Ev '^\s*(Table|PostUp|PostDown)\s*=' "$SRC_WG_CONF" > /tmp/wg0.base.conf

awk '
/^\[Interface\]/ {print; ininterface=1; next}
/^\[Peer\]/ {
    if (ininterface) {
        print "Table = off"
        print "PostUp = ip route replace default dev wg0 table 200"
        print "PostUp = iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE"
        print "PostUp = iptables -I FORWARD 1 -i wg0 -j ACCEPT"
        print "PostUp = iptables -I FORWARD 1 -o wg0 -j ACCEPT"
        print "PostDown = ip route del default dev wg0 table 200"
        print "PostDown = iptables -t nat -D POSTROUTING -o wg0 -j MASQUERADE"
        print "PostDown = iptables -D FORWARD -i wg0 -j ACCEPT"
        print "PostDown = iptables -D FORWARD -o wg0 -j ACCEPT"
    }
    ininterface=0
    print
    next
}
{print}
' /tmp/wg0.base.conf > "$WG_CONF"

chmod 600 "$WG_CONF"
rm -f /tmp/wg0.base.conf

# ---------------------------------------------------------------------------
# 7. Гарантируем порядок запуска и поднимаем wg0
# ---------------------------------------------------------------------------
mkdir -p /etc/systemd/system/wg-quick@wg0.service.d
cat > /etc/systemd/system/wg-quick@wg0.service.d/override.conf <<'EOF'
[Unit]
After=vps-split-routing.service
Requires=vps-split-routing.service
EOF

systemctl daemon-reload
systemctl enable --now wg-quick@wg0

# ---------------------------------------------------------------------------
# 8. ufw (если активен) — разрешаем SSH и форвардинг
# ---------------------------------------------------------------------------
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow "$SSH_PORT"/tcp || true
    sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
    ufw reload || true
fi

echo
echo "======================================================================"
echo " Готово."
echo " Проверьте В НОВОМ окне терминала:"
echo "   ssh <user>@<этот_сервер_ip> -p $SSH_PORT      -> должно работать"
echo "   curl ifconfig.me                              -> должен быть IP WG-сервера"
echo "   ip rule list                                  -> должны быть правила приоритета 100 и 200"
echo "   ip route show table 200                       -> default dev wg0"
echo "======================================================================"