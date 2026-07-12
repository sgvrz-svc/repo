#!/bin/bash

# Выход при любой ошибке
set -e

# Путь к вашему исходному файлу в корне
SOURCE_CONFIG="/wireguard.conf"
TARGET_CONFIG="/etc/wireguard/wg0.conf"

# Проверяем наличие файла в корне
if [ ! -f "$SOURCE_CONFIG" ]; then
    echo "[-] Ошибка: Файл $SOURCE_CONFIG не найден в корневом каталоге!"
    exit 1
fi

echo "[+] Определение сетевых параметров VPS..."
MAIN_IFACE=$(ip route show default | awk '/default/ {print $5; exit}')
MAIN_GATEWAY=$(ip route show default | awk '/default/ {print $3; exit}')
MAIN_IP=$(ip -o -4 addr show dev "$MAIN_IFACE" | awk '{split($4,a,"/"); print a; exit}')

if [ -z "$MAIN_IFACE" ] || [ -z "$MAIN_GATEWAY" ] || [ -z "$MAIN_IP" ]; then
    echo "[-] Ошибка: Не удалось определить сетевые настройки VPS."
    exit 1
fi

echo "    Интерфейс: $MAIN_IFACE"
echo "    IP VPS:     $MAIN_IP"
echo "    Шлюз:       $MAIN_GATEWAY"

echo "[+] Обновление пакетов и установка WireGuard..."
apt-get update -y
apt-get install -y wireguard iptables

echo "[+] Подготовка конфигурационного файла..."
# Копируем файл из корня в системную директорию WireGuard
cp "$SOURCE_CONFIG" "$TARGET_CONFIG"
chmod 600 "$TARGET_CONFIG"

# Удаляем старые строки PostUp / PostDown, если они случайно там были
sed -i '/PostUp/d' "$TARGET_CONFIG"
sed -i '/PostDown/d' "$TARGET_CONFIG"

# Формируем блок правил для сохранения SSH трафика
RULES="PostUp = ip rule add from $MAIN_IP table 200 priority 1000\n\
PostUp = ip route add default via $MAIN_GATEWAY dev $MAIN_IFACE table 200\n\
PostUp = iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE\n\
PostDown = ip rule del from $MAIN_IP table 200 priority 1000\n\
PostDown = ip route del default via $MAIN_GATEWAY dev $MAIN_IFACE table 200\n\
PostDown = iptables -t nat -D POSTROUTING -o wg0 -j MASQUERADE"

# Вставляем правила маршрутизации сразу после секции [Interface]
sed -i "/\[Interface\]/a $RULES" "$TARGET_CONFIG"

echo "[+] Включение маршрутизации пакетов (IP Forwarding) в ядре..."
sysctl -w net.ipv4.ip_forward=1
if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
fi

echo "[+] Запуск интерфейса WireGuard (wg0)..."
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "[+] Проверка статуса соединения..."
sleep 2
wg show

echo ""
echo "[+] УСПЕШНО: Внешний WireGuard поднят, SSH защищен от обрыва."
echo "    Файл конфигурации перенесен в $TARGET_CONFIG."
echo "    Теперь можно устанавливать AmneziaWG."
