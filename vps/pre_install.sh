#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

LOG_FILE="/tmp/update_system.log"
: > "$LOG_FILE"

LOCK_FILES=(
    "/var/lib/dpkg/lock-frontend"
    "/var/lib/dpkg/lock"
    "/var/lib/apt/lists/lock"
    "/var/cache/apt/archives/lock"
)

# ------------------------------------------------------------------
# Ждём, пока освободится dpkg/apt lock, показывая таймер в секундах
# ------------------------------------------------------------------
wait_for_locks() {
    local waited=0
    local busy_pid busy_file

    while true; do
        busy_pid=""
        busy_file=""
        for f in "${LOCK_FILES[@]}"; do
            if [ -e "$f" ]; then
                busy_pid=$(sudo fuser "$f" 2>/dev/null | awk '{print $1}')
                if [ -n "$busy_pid" ]; then
                    busy_file="$f"
                    break
                fi
            fi
        done

        if [ -z "$busy_pid" ]; then
            if [ "$waited" -gt 0 ]; then
                printf "\r✔ Блокировка apt/dpkg освобождена (ждали %d сек).            \n" "$waited"
            fi
            return 0
        fi

        printf "\r⏳ Ждём освобождения блокировки apt/dpkg: %d сек (занято PID %s, %s)   " \
            "$waited" "$busy_pid" "$busy_file"
        sleep 1
        waited=$((waited + 1))
    done
}

# ------------------------------------------------------------------
# Выполняет команду, скрывая её стандартный вывод и показывая таймер
# ------------------------------------------------------------------
run_step() {
    local title="$1"
    shift

    wait_for_locks

    local start
    start=$(date +%s)

    ( "$@" > "$LOG_FILE" 2>&1 ) &
    local pid=$!

    while kill -0 "$pid" 2>/dev/null; do
        local now elapsed
        now=$(date +%s)
        elapsed=$((now - start))
        printf "\r⏳ %s: %d сек...   " "$title" "$elapsed"
        sleep 1
    done

    wait "$pid"
    local status=$?
    local now elapsed
    now=$(date +%s)
    elapsed=$((now - start))

    if [ "$status" -eq 0 ]; then
        printf "\r✔ %s — готово за %d сек.                    \n" "$title" "$elapsed"
    else
        printf "\r✖ %s — ОШИБКА (код %d) за %d сек. Подробности: %s\n" \
            "$title" "$status" "$elapsed" "$LOG_FILE"
        exit "$status"
    fi
}

write_sources_file() {
    sudo tee /etc/apt/sources.list.d/ubuntu.sources > /dev/null << 'EOF'
Types: deb deb-src
URIs: http://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb deb-src
URIs: http://security.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
}

echo "=================================================="
echo "  Ubuntu Sources & System Update Script"
echo "=================================================="
echo ""

run_step "Запись нового списка источников APT"      write_sources_file
run_step "Обновление списка пакетов (apt update)"    sudo apt-get update -y
run_step "Обновление установленных пакетов (upgrade)" sudo apt-get upgrade -y
run_step "Удаление неиспользуемых пакетов"           sudo apt-get autoremove -y
run_step "Установка curl"                            sudo apt-get install -y curl

echo ""
echo "=================================================="
echo "  Всё готово! Перезагрузка системы..."
echo "=================================================="

for i in 3 2 1; do
    printf "\rПерезагрузка через %d сек...   " "$i"
    sleep 1
done
printf "\rПерезагружаемся...                 \n"

sudo reboot