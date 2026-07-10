#!/bin/bash
set -euo pipefail

echo "=================================================="
echo "  Ubuntu Sources & System Update Script"
echo "=================================================="
echo ""

echo "[1/6] Writing new APT sources list..."
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
echo "✔ Sources file updated successfully."
echo ""

echo "[2/6] Updating package lists..."
sudo apt update
echo "✔ Package lists updated."
echo ""

echo "[3/6] Upgrading installed packages..."
sudo apt upgrade -y
echo "✔ System upgraded."
echo ""

echo "[4/6] Removing unused packages..."
sudo apt autoremove -y
echo "✔ Cleanup complete."
echo ""

echo "[5/6] Installing curl..."
sudo apt install -y curl
echo "✔ curl installed."
echo ""

echo "[6/6] Rebooting system..."
echo "=================================================="
echo "  All done! The system will reboot now."
echo "=================================================="
sleep 3
sudo reboot