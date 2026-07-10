#!/usr/bin/env bash
#
# setup-wireguard.sh
#
# Устанавливает WireGuard на Ubuntu 24.04, поднимает туннель из /root/outbound.conf
# и заворачивает в него ВЕСЬ трафик, КРОМЕ SSH (SSH продолжает ходить через
# обычный шлюз провайдера, чтобы вы не потеряли доступ к серверу).
#
# Использование:
#   sudo bash setup-wireguard.sh [ssh_port]
#
# Если ssh_port не указан — скрипт попробует определить его из /etc/ssh/sshd_config,
# по умолчанию 22.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Запускайте скрипт от root (sudo bash $0)" >&2
    exit 1
fi

SRC_CONF="outbound.conf"
WG_CONF="/etc/wireguard/wg0.conf"
POSTUP_SH="/etc/wireguard/wg0-postup.sh"
POSTDOWN_SH="/etc/wireguard/wg0-postdown.sh"
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

# --- Убираем возможные старые PostUp/PostDown строки, добавленные раньше ---
sed -i '/# >>> ssh-bypass-managed/,/# <<< ssh-bypass-managed/d' "$WG_CONF"
sed -i '/^PostUp\s*=/d; /^PostDown\s*=/d' "$WG_CONF"

# --- Создаём отдельные хук-скрипты (так надёжнее, чем длинные строки внутри .conf) ---
cat > "$POSTUP_SH" <<EOF
#!/usr/bin/env bash
set -e
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

# --- Добавляем в конфиг только короткие ссылки на хук-скрипты ---
cat >> "$WG_CONF" <<EOF

# >>> ssh-bypass-managed
PostUp = $POSTUP_SH
PostDown = $POSTDOWN_SH
# <<< ssh-bypass-managed
EOF

chmod 600 "$WG_CONF"

# --- Включаем IP forwarding на случай, если конфиг используется и как шлюз для других хостов ---
sed -i '/^net.ipv4.ip_forward/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p >/dev/null

# --- Проверка на всякий случай: нет ли в конфиге "слипшихся" строк без пробелов ---
if grep -qE '^\S+=\S' "$WG_CONF"; then
    echo "ВНИМАНИЕ: в $WG_CONF обнаружены строки без пробелов вокруг '='. Проверьте файл вручную:"
    grep -nE '^\S+=\S' "$WG_CONF" || true
fi

# --- Перезапускаем интерфейс ---
echo "==> Поднимаем интерфейс wg0..."
systemctl enable wg-quick@wg0
if ! systemctl restart wg-quick@wg0; then
    echo "Не удалось поднять интерфейс. Подробности:"
    wg-quick up wg0 || true
    exit 1
fi

echo
echo "==================================================================="
echo "Готово."
echo "  Интерфейс:         wg0"
echo "  Конфиг:            $WG_CONF"
echo "  Хук-скрипты:       $POSTUP_SH / $POSTDOWN_SH"
echo "  SSH-порт (в обход):$SSH_PORT"
echo "  Исходный шлюз:     $ORIG_GW через $ORIG_IF (используется только для SSH)"
echo
echo "Проверить статус:   wg show"
echo "Проверить маршруты: ip route show table $RT_TABLE_NAME"
echo "Проверить правила:  ip rule show"
echo "Проверить выход:    curl -4 ifconfig.me"
echo "==================================================================="