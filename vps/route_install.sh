#!/usr/bin/env bash

if [[ $EUID -ne 0 ]]; then
    echo "Запускайте скрипт от root (sudo bash $0)" >&2
    exit 1
fi

SRC_CONF="/outbound.conf"
WG_CONF="/etc/wireguard/wg0.conf"
FWMARK="0x1"
RT_TABLE_NUM="100"
RT_TABLE_NAME="wg-ssh-bypass"

if [[ ! -f "$SRC_CONF" ]]; then
    echo "Не найден файл конфигурации: $SRC_CONF" >&2
    exit 1
fi

# --- Определяем порт SSH ---
SSH_PORT="${1:-}"
if [[ -z "$SSH_PORT" ]]; then
    SSH_PORT="$(grep -iE '^\s*Port\s+[0-9]+' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' | head -n1)"
    SSH_PORT="${SSH_PORT:-22}"
fi
echo "==> Будет использован SSH-порт: $SSH_PORT"

# --- Определяем текущий дефолтный шлюз и интерфейс (до поднятия WireGuard) ---
DEFAULT_ROUTE="$(ip -4 route show default | head -n1)"
if [[ -z "$DEFAULT_ROUTE" ]]; then
    echo "Не удалось определить текущий маршрут по умолчанию." >&2
    exit 1
fi
ORIG_GW="$(awk '{for(i=1;i<=NF;i++) if ($i=="via") print $(i+1)}' <<< "$DEFAULT_ROUTE")"
ORIG_IF="$(awk '{for(i=1;i<=NF;i++) if ($i=="dev") print $(i+1)}' <<< "$DEFAULT_ROUTE")"

if [[ -z "$ORIG_GW" || -z "$ORIG_IF" ]]; then
    echo "Не удалось разобрать шлюз/интерфейс из: $DEFAULT_ROUTE" >&2
    exit 1
fi
echo "==> Текущий шлюз: $ORIG_GW, интерфейс: $ORIG_IF"

# --- Устанавливаем WireGuard ---
echo "==> Устанавливаем пакеты..."
apt-get update -y
apt-get install -y wireguard wireguard-tools iptables iproute2

# --- Добавляем таблицу маршрутизации для SSH-обхода (если ещё нет) ---
if ! grep -qE "^[0-9]+[[:space:]]+$RT_TABLE_NAME\$" /etc/iproute2/rt_tables 2>/dev/null; then
    echo "$RT_TABLE_NUM $RT_TABLE_NAME" >> /etc/iproute2/rt_tables
fi

# --- Копируем конфиг ---
install -m 600 "$SRC_CONF" "$WG_CONF"

# Проверим, что AllowedIPs = 0.0.0.0/0 (иначе wg-quick не создаст split-default маршруты)
if ! grep -qE '^\s*AllowedIPs\s*=.*0\.0\.0\.0/0' "$WG_CONF"; then
    echo "ВНИМАНИЕ: в $WG_CONF не найдено AllowedIPs = 0.0.0.0/0."
    echo "Для маршрутизации всего трафика через туннель добавьте эту строку в секцию [Peer]."
fi

# --- Убираем возможные старые PostUp/PostDown/PreDown, добавленные этим скриптом ранее ---
sed -i '/# >>> ssh-bypass-managed/,/# <<< ssh-bypass-managed/d' "$WG_CONF"

# --- Добавляем правила PostUp/PostDown в секцию [Interface] ---
cat >> "$WG_CONF" <<EOF

# >>> ssh-bypass-managed
PostUp = iptables -t mangle -A OUTPUT -p tcp --sport $SSH_PORT -j MARK --set-mark $FWMARK
PostUp = ip rule add fwmark $FWMARK table $RT_TABLE_NAME priority 100
PostUp = ip route replace default via $ORIG_GW dev $ORIG_IF table $RT_TABLE_NAME
PostDown = iptables -t mangle -D OUTPUT -p tcp --sport $SSH_PORT -j MARK --set-mark $FWMARK
PostDown = ip rule del fwmark $FWMARK table $RT_TABLE_NAME priority 100 || true
PostDown = ip route flush table $RT_TABLE_NAME || true
# <<< ssh-bypass-managed
EOF

chmod 600 "$WG_CONF"

# --- Включаем IP forwarding на случай, если конфиг используется и как шлюз для других хостов ---
sed -i '/^net.ipv4.ip_forward/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p >/dev/null

# --- Перезапускаем интерфейс ---
echo "==> Поднимаем интерфейс wg0..."
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0

echo
echo "==================================================================="
echo "Готово."
echo "  Интерфейс:         wg0"
echo "  Конфиг:            $WG_CONF"
echo "  SSH-порт (в обход):$SSH_PORT"
echo "  Исходный шлюз:     $ORIG_GW через $ORIG_IF (используется только для SSH)"
echo
echo "Проверить статус:   wg show"
echo "Проверить маршруты: ip route show table $RT_TABLE_NAME"
echo "Проверить правила:  ip rule show"
echo "==================================================================="