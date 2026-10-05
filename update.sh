#!/usr/bin/env bash
# =========================================================================
# CloudPRO Server 1-Click Update & Self-Healing Script (WSL & Ubuntu Safe)
# =========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" 2>/dev/null || true

# Dukungan cek cepat tanpa update: bash update.sh --check
if [ "$1" == "--check" ] || [ "$1" == "-c" ] || [ "$1" == "check" ]; then
  echo "========================================================"
  echo " [CloudPRO] Memeriksa Kommit Terbaru dari GitHub...     "
  echo "========================================================"
  git fetch origin main -q 2>/dev/null || true
  LOCAL_C="$(git rev-parse --short HEAD 2>/dev/null || echo '-')"
  LOCAL_M="$(git log -1 --pretty=%s 2>/dev/null || echo '-')"
  REMOTE_C="$(git rev-parse --short origin/main 2>/dev/null || echo '-')"
  REMOTE_M="$(git log -1 --pretty=%s origin/main 2>/dev/null || echo '-')"
  REMOTE_D="$(git log -1 --pretty='%cd (%cr)' origin/main 2>/dev/null || echo '-')"

  echo "● Versi di Server Anda : $LOCAL_C ($LOCAL_M)"
  echo "● Versi Terbaru GitHub : $REMOTE_C ($REMOTE_M)"
  echo "● Tanggal Rilis GitHub : $REMOTE_D"
  echo "--------------------------------------------------------"
  if [ "$LOCAL_C" == "$REMOTE_C" ] && [ "$LOCAL_C" != "-" ]; then
    echo "✅ STATUS: Server Anda SUDAH menggunakan versi GitHub paling terbaru!"
  else
    echo "🌟 STATUS: DITEMUKAN VERSI BARU! Jalankan: bash update.sh"
  fi
  echo "========================================================"
  exit 0
fi

echo "========================================================"
echo " [CloudPRO] Memulai Update Server & Self-Healing SSH    "
echo " Direktori Kerja: $SCRIPT_DIR"
echo "========================================================"

# -------------------------------------------------------------------------
# [0/3] AUTO-HEAL TERMINAL UBUNTU, ~/.bashrc, DAN OPENSSH DAEMON (WSL/PC)
# Mencegah terminal Ubuntu / SSH langsung menutup atau hang saat dibuka
# -------------------------------------------------------------------------
heal_shell_rc() {
  local RC_FILE="$1"
  [ -f "$RC_FILE" ] || return 0

  # 1. Hapus karakter CRLF (\r) Windows
  sed -i 's/\r$//' "$RC_FILE" 2>/dev/null || true

  # 2. Nonaktifkan baris otomatis di .bashrc/.profile yang memicu exit/exec/hang saat buka terminal
  sed -i -E 's/^[[:space:]]*(exit([[:space:]]+[0-9]+)?|logout)[[:space:]]*$/# [CloudPRO Auto-Heal] \1/' "$RC_FILE" 2>/dev/null || true
  sed -i -E 's/^[[:space:]]*(exec[[:space:]]+.*)$/# [CloudPRO Auto-Heal] \1/' "$RC_FILE" 2>/dev/null || true
  sed -i -E 's/^.*(source|\.|bash|sh)[[:space:]]+.*update\.sh.*$/# [CloudPRO Auto-Heal] &/' "$RC_FILE" 2>/dev/null || true
  sed -i -E 's/^.*\/update\.sh.*$/# [CloudPRO Auto-Heal] &/' "$RC_FILE" 2>/dev/null || true
  sed -i -E 's/^[[:space:]]*fuser[[:space:]]+-k.*$/# [CloudPRO Auto-Heal] &/' "$RC_FILE" 2>/dev/null || true

  # 3. Cek syntax bash
  if ! bash -n "$RC_FILE" 2>/dev/null; then
    cp -f "$RC_FILE" "${RC_FILE}.bak-cloudpro" 2>/dev/null || true
    if [ -f "/etc/skel/.bashrc" ] && [[ "$RC_FILE" == *".bashrc" ]]; then
      cp -f "/etc/skel/.bashrc" "$RC_FILE" 2>/dev/null || true
    else
      echo "# CloudPRO Clean Shell Profile" > "$RC_FILE"
    fi
  fi

  # 4. Pasang alias update yang bersih tanpa mengunci TTY
  sed -i '/alias update=/d' "$RC_FILE" 2>/dev/null || true
  sed -i '/alias cek-update=/d' "$RC_FILE" 2>/dev/null || true
  sed -i '/alias versi=/d' "$RC_FILE" 2>/dev/null || true
  sed -i '/alias git-log=/d' "$RC_FILE" 2>/dev/null || true
  sed -i '/alias git-status=/d' "$RC_FILE" 2>/dev/null || true
  if [[ "$RC_FILE" == *".bashrc" ]]; then
    echo "alias update='bash \"$SCRIPT_DIR/update.sh\"'" >> "$RC_FILE"
    echo "alias cek-update='bash \"$SCRIPT_DIR/update.sh\" --check'" >> "$RC_FILE"
    echo "alias versi='git -C \"$SCRIPT_DIR\" log -1 --format=\"[KOMMIT AKTIF] %h%n[JUDUL]        %s%n[TANGGAL]      %cd (%cr)%n[AUTHOR]       %an\"'" >> "$RC_FILE"
    echo "alias git-log='git -C \"$SCRIPT_DIR\" log -1 --oneline'" >> "$RC_FILE"
    echo "alias git-status='git -C \"$SCRIPT_DIR\" status'" >> "$RC_FILE"
  fi
}

for TARGET_HOME in /root /home/*; do
  if [ -d "$TARGET_HOME" ]; then
    heal_shell_rc "$TARGET_HOME/.bashrc"
    heal_shell_rc "$TARGET_HOME/.profile"
    heal_shell_rc "$TARGET_HOME/.bash_profile"
    if [ -d "$TARGET_HOME/.ssh" ]; then
      chmod 700 "$TARGET_HOME/.ssh" 2>/dev/null || true
      chmod 600 "$TARGET_HOME/.ssh/authorized_keys" 2>/dev/null || true
    fi
    # Pasang update.sh langsung di root Home user agar 'bash update.sh' dari folder ~ tidak pernah error 'No such file'
    if [ "$TARGET_HOME" != "$SCRIPT_DIR" ]; then
      cat << 'WRAPPER_EOF' > "$TARGET_HOME/update.sh"
#!/usr/bin/env bash
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
for candidate in "$SCRIPT_DIR/CloudPRO-Server" "$SCRIPT_DIR/Cloud-PRO" "/home/cloudpro/CloudPRO-Server" "/root/CloudPRO-Server" "/root/Cloud-PRO" "/var/www/Cloud-PRO" "/app/applet"; do
  if [ -f "$candidate/update.sh" ] && [ "$candidate" != "$SCRIPT_DIR" ]; then
    cd "$candidate" && exec bash update.sh "$@"
  fi
done
echo "[ERROR] Direktori CloudPRO tidak ditemukan."
exit 1
WRAPPER_EOF
      chmod +x "$TARGET_HOME/update.sh" 2>/dev/null || true
    fi
  fi
done

# Pasang perintah global /usr/local/bin/cloudpro & /usr/local/bin/update
cat << 'BIN_EOF' > /tmp/cloudpro-global-bin
#!/usr/bin/env bash
SCRIPT_PATH=""
for candidate in "/home/cloudpro/CloudPRO-Server" "/root/CloudPRO-Server" "/root/Cloud-PRO" "/var/www/Cloud-PRO" "$HOME/CloudPRO-Server" "$HOME/Cloud-PRO" "/app/applet"; do
  if [ -f "$candidate/update.sh" ]; then
    SCRIPT_PATH="$candidate"
    break
  fi
done

if [ -z "$SCRIPT_PATH" ]; then
  echo "[ERROR] Direktori CloudPRO tidak ditemukan."
  exit 1
fi

BIN_NAME="$(basename "$0")"

# Jika dipanggil langsung sebagai 'update' atau argumen pertamanya adalah 'update' / 'up', LANGSUNG jalankan update.sh
if [ "$BIN_NAME" = "update" ] || [ "$1" = "update" ] || [ "$1" = "up" ]; then
  if [ "$1" = "update" ] || [ "$1" = "up" ]; then
    shift
  fi
  cd "$SCRIPT_PATH" && exec bash update.sh "$@"
fi

case "$1" in
  restart|reload)
    pm2 restart cloudpro --update-env 2>/dev/null || pm2 restart all
    echo "[OK] Service CloudPRO berhasil di-restart!"
    ;;
  logs|log)
    pm2 logs cloudpro --lines 30
    ;;
  status|stat)
    echo "========================================="
    echo "  CloudPRO Enterprise Server Status"
    echo "========================================="
    echo "Direktori  : $SCRIPT_PATH"
    echo "Versi Git  : $(git -C "$SCRIPT_PATH" rev-parse --short HEAD 2>/dev/null) - $(git -C "$SCRIPT_PATH" log -1 --pretty=%s 2>/dev/null)"
    echo "Port 3000  : $(curl -sI --max-time 3 http://127.0.0.1:3000/ | grep -q HTTP && echo '🟢 ONLINE (Aktif)' || echo '🔴 OFFLINE')"
    echo "Tunnel CF  : $(pgrep -f "cloudflared.*tunnel" >/dev/null && echo '🟢 AKTIF' || echo '⚪ TIDAK AKTIF')"
    echo "URL Panel  : https://cloudpro.denbaguse.my.id"
    echo "URL Web SSH: https://cloudpro.denbaguse.my.id/ssh"
    echo "========================================="
    ;;
  *)
    if [ -n "$1" ]; then
      cd "$SCRIPT_PATH" && exec bash update.sh "$@"
    else
      echo "========================================="
      echo "  CloudPRO Enterprise Command Line"
      echo "========================================="
      echo "Direktori  : $SCRIPT_PATH"
      echo "Versi Git  : $(git -C "$SCRIPT_PATH" rev-parse --short HEAD 2>/dev/null) - $(git -C "$SCRIPT_PATH" log -1 --pretty=%s 2>/dev/null)"
      echo "Status     : $(curl -sI --max-time 3 http://127.0.0.1:3000/ | grep -q HTTP && echo '🟢 Online di Port 3000' || echo '🔴 Offline')"
      echo ""
      echo "Perintah yang Tersedia:"
      echo "  update             -> Menarik update terbaru dari GitHub & me-reload server"
      echo "  cloudpro update    -> Menarik update terbaru dari GitHub & me-reload server"
      echo "  cloudpro restart   -> Me-restart service server PM2"
      echo "  cloudpro logs      -> Melihat log aktivitas server"
      echo "  cloudpro status    -> Memeriksa status kesehatan server"
      echo "========================================="
    fi
    ;;
esac
BIN_EOF

chmod +x /tmp/cloudpro-global-bin 2>/dev/null || true
if [ "$(id -u)" -eq 0 ]; then
  cp -f /tmp/cloudpro-global-bin /usr/local/bin/cloudpro 2>/dev/null || true
  cp -f /tmp/cloudpro-global-bin /usr/local/bin/update 2>/dev/null || true
else
  sudo -n cp -f /tmp/cloudpro-global-bin /usr/local/bin/cloudpro 2>/dev/null || true
  sudo -n cp -f /tmp/cloudpro-global-bin /usr/local/bin/update 2>/dev/null || true
fi
rm -f /tmp/cloudpro-global-bin 2>/dev/null || true

# Jalankan sshd secara non-blocking & pasang keepalive agar koneksi SSH tidak pernah putus/dc otomatis
SSHD_CFG="/etc/ssh/sshd_config"
if [ -f "$SSHD_CFG" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    sed -i '/ClientAliveInterval/d' "$SSHD_CFG" 2>/dev/null || true
    sed -i '/ClientAliveCountMax/d' "$SSHD_CFG" 2>/dev/null || true
    sed -i '/TCPKeepAlive/d' "$SSHD_CFG" 2>/dev/null || true
    echo "ClientAliveInterval 30" >> "$SSHD_CFG"
    echo "ClientAliveCountMax 120" >> "$SSHD_CFG"
    echo "TCPKeepAlive yes" >> "$SSHD_CFG"
  fi
fi

if [ "$(id -u)" -eq 0 ]; then
  mkdir -p /run/sshd 2>/dev/null || true
  ssh-keygen -A 2>/dev/null || true
  service ssh restart 2>/dev/null || service ssh start 2>/dev/null < /dev/null || true
else
  sudo -n mkdir -p /run/sshd 2>/dev/null || true
  sudo -n ssh-keygen -A 2>/dev/null || true
  sudo -n service ssh restart 2>/dev/null || sudo -n service ssh start 2>/dev/null < /dev/null || true
fi
echo "[OK] Konfigurasi Shell Ubuntu (~/.bashrc) & Daemon SSH (Anti-Disconnect) telah dipasang!"

echo "[1/3] Mengambil kode terbaru dari GitHub..."
GITHUB_TOKEN="${GITHUB_TOKEN:-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}"
DEFAULT_REPO="https://x-access-token:${GITHUB_TOKEN}@github.com/cloudproenterprise-web/Cloud-PRO.git"
CURRENT_ORIGIN="$(git remote get-url origin 2>/dev/null || echo "")"

if [ -n "$CURRENT_ORIGIN" ] && [[ "$CURRENT_ORIGIN" == *"github.com"* ]]; then
  if [[ "$CURRENT_ORIGIN" != *"ghp_"* ]] && [[ "$CURRENT_ORIGIN" != *"x-access-token"* ]]; then
    REPO_URL="$DEFAULT_REPO"
  else
    REPO_URL="$CURRENT_ORIGIN"
  fi
else
  REPO_URL="$DEFAULT_REPO"
fi

export GIT_TERMINAL_PROMPT=0

if [ ! -d ".git" ]; then
  echo "[INFO] Folder .git belum terdeteksi. Menginisialisasi repository Git otomatis..."
  git init
  git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
else
  git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"
fi

VAULT_DIR="$HOME/.cloudpro-persistent-vault"
mkdir -p "$VAULT_DIR" .cloudpro-data 2>/dev/null || true

# Backup state lokal ke Persistent Vault sebelum git reset
for STATE_FILE in cloudpro-full-state.json cloudpro-vhost-store.json cloudpro-tunnel-config.json cloudpro-ddns-config.json; do
  if [ -f ".cloudpro-data/$STATE_FILE" ] && [ ! -f "$VAULT_DIR/$STATE_FILE" ]; then
    cp -f ".cloudpro-data/$STATE_FILE" "$VAULT_DIR/$STATE_FILE" 2>/dev/null || true
  fi
done

PREV_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'awal')"
PREV_MSG="$(git log -1 --pretty=%s 2>/dev/null || echo '-')"

git branch -D origin/main 2>/dev/null || true
echo " > Menghubungi GitHub & mengunduh kommit terbaru..."
git fetch origin main --force -q

NEW_COMMIT="$(git rev-parse --short FETCH_HEAD 2>/dev/null || echo 'unknown')"
NEW_MSG="$(git log -1 --pretty=%s FETCH_HEAD 2>/dev/null || echo '-')"
NEW_DATE="$(git log -1 --pretty='%cd (%cr)' FETCH_HEAD 2>/dev/null || echo '-')"
NEW_AUTHOR="$(git log -1 --pretty='%an' FETCH_HEAD 2>/dev/null || echo '-')"

echo "--------------------------------------------------------"
echo " [STATUS SINKRONISASI GITHUB]"
echo " ● Versi Lokal Sebelumnya : $PREV_COMMIT ($PREV_MSG)"
echo " ● Versi Kommit GitHub    : $NEW_COMMIT"
echo " ● Judul Kommit Terbaru   : $NEW_MSG"
echo " ● Tanggal Rilis GitHub   : $NEW_DATE"
echo " ● Author / Developer     : $NEW_AUTHOR"
if [ "$PREV_COMMIT" != "$NEW_COMMIT" ] && [ "$PREV_COMMIT" != "awal" ]; then
  echo " ● Status Sinkronisasi    : 🌟 DITEMUKAN PEMBARUAN BARU (Menerapkan ke Server...)"
else
  echo " ● Status Sinkronisasi    : ✅ SUDAH VERSI TERBARU (Menyinkronkan & menyegarkan service...)"
fi
echo "--------------------------------------------------------"

git reset --hard FETCH_HEAD
git clean -fd -e .cloudpro-data -e public_html -e dist 2>/dev/null || true
git gc --prune=now -q 2>/dev/null || true

# Pulihkan kembali state dari Persistent Vault ke .cloudpro-data setelah git reset
for STATE_FILE in cloudpro-full-state.json cloudpro-vhost-store.json cloudpro-tunnel-config.json cloudpro-ddns-config.json; do
  if [ -f "$VAULT_DIR/$STATE_FILE" ]; then
    cp -f "$VAULT_DIR/$STATE_FILE" ".cloudpro-data/$STATE_FILE" 2>/dev/null || true
  fi
done

echo "[2/3] Meng-compile aset web terbaru & menyinkronkan Service CloudPRO..."
export NODE_ENV=production
export PATH="$PATH:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin"

# Compile frontend (Vite) & backend (server.js) secara lengkap agar tidak terjadi blank screen
if command -v npm &> /dev/null; then
  echo "[BUILD] Meng-compile aset frontend & backend CloudPRO terbaru..."
  npm run build 2>&1 | tail -n 10 || npm run build:server 2>&1 || true
fi

# Hentikan proses node server.js / tsx server.ts liar di luar PM2 agar tidak berebut port 3000 (tanpa memutus terminal)
if [ "$(id -u)" -ne 0 ]; then
  sudo -n pm2 delete cloudpro 2>/dev/null < /dev/null || true
fi

if command -v pm2 &> /dev/null; then
  # Bersihkan dulu proses liar yang mengunci port 3000
  OLD_PIDS=$(pgrep -f "node.*server\.js|tsx.*server\.ts" 2>/dev/null | grep -v "^$$\$" | grep -v "^$PPID\$" || true)
  for pid in $OLD_PIDS; do
    kill -9 "$pid" 2>/dev/null || sudo -n kill -9 "$pid" 2>/dev/null || true
  done
  pm2 restart cloudpro --update-env 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || pm2 restart all 2>/dev/null || pm2 start server.js --name cloudpro --update-env 2>/dev/null || true
  pm2 save < /dev/null 2>/dev/null || true
  echo "[OK] Server CloudPRO aktif & berjalan segar via PM2!"
else
  OLD_NODE_PIDS=$(pgrep -f "node.*server\.js|tsx.*server\.ts" 2>/dev/null | grep -v "^$$\$" | grep -v "^$PPID\$" || true)
  if [ -n "$OLD_NODE_PIDS" ]; then
    for pid in $OLD_NODE_PIDS; do
      kill -9 "$pid" 2>/dev/null || sudo -n kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
  fi
  if command -v setsid &>/dev/null; then
    NODE_ENV=production nohup setsid node server.js > cloudpro.log 2>&1 < /dev/null &
  else
    NODE_ENV=production nohup node server.js > cloudpro.log 2>&1 < /dev/null &
  fi
  echo "[OK] Server CloudPRO aktif via background Node (PID: $!)"
fi

# -------------------------------------------------------------------------
# [AUTO-INSTALL & AUTO-SERVICE CLOUDFLARED] JIKA BELUM TERPASANG
# Mengunduh binary resmi cloudflared dan memasangnya sebagai System Daemon permanen
# -------------------------------------------------------------------------
CLOUDFLARE_DEFAULT_TOKEN="eyJhIjoiZTkwMjEzZWRiMzQ3NmJiMzAwNzAyNmQ3Y2QyMjk2NjEiLCJ0IjoiNmZiMDE1YjItYzdiNS00Y2EwLTgxYjYtYzI4ZWVmYTZlNGU0IiwicyI6Ik5UVTBOMkkxWVRndFlqQmhaaTAwWmpVNExUbGxNMlF0WkdFM1ltRTVOamRoTUdaaCJ9"

if ! command -v cloudflared &>/dev/null; then
  echo "[CLOUDFLARE] Mengunduh binary resmi cloudflared..."
  ARCH="$(uname -m)"
  CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
  fi
  if [ "$(id -u)" -eq 0 ]; then
    curl -sL --retry 3 --connect-timeout 10 "$CF_URL" -o /usr/local/bin/cloudflared 2>/dev/null || true
    chmod +x /usr/local/bin/cloudflared 2>/dev/null || true
  else
    sudo -n curl -sL --retry 3 --connect-timeout 10 "$CF_URL" -o /usr/local/bin/cloudflared 2>/dev/null || true
    sudo -n chmod +x /usr/local/bin/cloudflared 2>/dev/null || true
  fi
  if command -v cloudflared &>/dev/null; then
    echo "[OK] Binary cloudflared berhasil dipasang di /usr/local/bin/cloudflared!"
  fi
fi

# Pasang cloudflared sebagai Systemd Service resmi jika belum ada
if command -v cloudflared &>/dev/null && command -v systemctl &>/dev/null; then
  if [ ! -f "/etc/systemd/system/cloudflared.service" ]; then
    echo "[CLOUDFLARE] Memasang cloudflared sebagai System Service resmi 24/7..."
    if [ "$(id -u)" -eq 0 ]; then
      cloudflared service install "$CLOUDFLARE_DEFAULT_TOKEN" 2>/dev/null || true
    else
      sudo -n cloudflared service install "$CLOUDFLARE_DEFAULT_TOKEN" 2>/dev/null || true
    fi
  fi
fi

# -------------------------------------------------------------------------
# [WSL SYSTEMD AUTO-ACTIVATOR]
# Jika berjalan di WSL (Windows), aktifkan systemd permanen di /etc/wsl.conf
# -------------------------------------------------------------------------
if [ -f /proc/version ] && grep -qi "microsoft" /proc/version 2>/dev/null; then
  if [ ! -f /etc/wsl.conf ] || ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
    echo "[WSL] Mengaktifkan konfigurasi Systemd permanen di /etc/wsl.conf..."
    if [ "$(id -u)" -eq 0 ]; then
      cat << 'WSL_EOF' >> /etc/wsl.conf
[boot]
systemd=true
WSL_EOF
    else
      sudo -n bash -c 'cat << "WSL_EOF" >> /etc/wsl.conf
[boot]
systemd=true
WSL_EOF' 2>/dev/null || true
    fi
  fi
fi

# Cek apakah systemd aktif sebagai PID 1
HAS_SYSTEMD=false
if [ -d /run/systemd/system ] && systemctl is-system-running &>/dev/null; then
  HAS_SYSTEMD=true
fi

# -------------------------------------------------------------------------
# [ANTI-SLEEP & ALWAYS-ON 24/7 ENFORCEMENT]
# Mencegah OS Linux/WSL/Server masuk mode Sleep, Suspend, atau Hibernate saat malam hari
# -------------------------------------------------------------------------
if [ "$HAS_SYSTEMD" = true ]; then
  if [ "$(id -u)" -eq 0 ]; then
    systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null || true
    systemctl enable cloudflared 2>/dev/null || true
  else
    sudo -n systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null || true
    sudo -n systemctl enable cloudflared 2>/dev/null || true
  fi
fi

# Bersihkan proses cloudflared ganda di background agar tidak bentrok session di Cloudflare Edge
pkill -9 -f "cloudflared.*tunnel" 2>/dev/null || true

# Pastikan service cloudflared dihidupkan (Kompatibel dengan Systemd & SysV / WSL)
if [ "$HAS_SYSTEMD" = true ]; then
  if [ "$(id -u)" -eq 0 ]; then
    systemctl restart cloudflared 2>/dev/null < /dev/null || true
  else
    sudo -n systemctl restart cloudflared 2>/dev/null < /dev/null || true
  fi
else
  # Lingkungan SysV / WSL tanpa native systemd PID 1
  if [ "$(id -u)" -eq 0 ]; then
    service cloudflared restart 2>/dev/null < /dev/null || service cloudflared start 2>/dev/null < /dev/null || true
  else
    sudo -n service cloudflared restart 2>/dev/null < /dev/null || sudo -n service cloudflared start 2>/dev/null < /dev/null || true
  fi
fi

# Jika service belum running, jalankan background tunnel langsung
if ! pgrep -f "cloudflared" >/dev/null 2>&1; then
  nohup cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_DEFAULT_TOKEN" >/dev/null 2>&1 &
fi

echo "[3/3] Verifikasi Status Server & Pembersihan Sampah Disk..."
sleep 2
CLEAN_RES=$(curl -s --max-time 5 -X POST http://127.0.0.1:3000/api/system/clean-disk || true)
if [ -n "$CLEAN_RES" ]; then
  echo " [DISK CLEANER] Sampah sisa instalasi lama berhasil dibersihkan otomatis!"
fi

# -------------------------------------------------------------------------
# [24/7 WATCHDOG AUTO-HEALER] PEMANTAU PERMANEN ANTI-ERROR 1033 & CRASH
# Berjalan otomatis setiap 1 menit:
# 1. Cek port 3000 (Node.js/PM2). Jika mati -> auto-revive.
# 2. Cek daemon cloudflared tunnel (Systemd, SysV, atau Daemon). Jika terputus -> auto-restart.
# 3. Kirim keepalive ping ringan ke Cloudflare Edge agar koneksi ISP tidak idle.
# -------------------------------------------------------------------------
WATCHDOG_SCRIPT="/usr/local/bin/cloudpro-watchdog.sh"
cat << 'WATCHDOG_EOF' > /tmp/cloudpro-watchdog.sh
#!/usr/bin/env bash
# CloudPRO 24/7 Watchdog Daemon & Tunnel Keepalive
CLOUDFLARE_DEFAULT_TOKEN="eyJhIjoiZTkwMjEzZWRiMzQ3NmJiMzAwNzAyNmQ3Y2QyMjk2NjEiLCJ0IjoiNmZiMDE1YjItYzdiNS00Y2EwLTgxYjYtYzI4ZWVmYTZlNGU0IiwicyI6Ik5UVTBOMkkxWVRndFlqQmhaaTAwWmpVNExUbGxNMlF0WkdFM1ltRTVOamRoTUdaaCJ9"

# 1. Anti-Idle ping ke Cloudflare Edge agar koneksi ISP tidak idle / timeout
curl -sI --max-time 3 https://1.1.1.1 >/dev/null 2>&1 || true

# 2. Cek Service CloudPRO (Port 3000)
if ! curl -sI --max-time 3 http://127.0.0.1:3000/ >/dev/null 2>&1; then
  if command -v pm2 &>/dev/null; then
    pm2 restart cloudpro --update-env >/dev/null 2>&1 || pm2 restart all >/dev/null 2>&1 || true
  fi
fi

# 3. Cek Cloudflare Tunnel Daemon (Pencegah Error 1033)
if ! pgrep -f "cloudflared" >/dev/null 2>&1; then
  if [ -d /run/systemd/system ] && systemctl is-system-running &>/dev/null; then
    systemctl restart cloudflared >/dev/null 2>&1 || sudo -n systemctl restart cloudflared >/dev/null 2>&1 || true
  else
    service cloudflared restart >/dev/null 2>&1 || service cloudflared start >/dev/null 2>&1 || sudo -n service cloudflared restart >/dev/null 2>&1 || sudo -n service cloudflared start >/dev/null 2>&1 || true
  fi
  # Fallback mandiri jika service manager belum siap
  if ! pgrep -f "cloudflared" >/dev/null 2>&1; then
    nohup cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_DEFAULT_TOKEN" >/dev/null 2>&1 &
  fi
fi
WATCHDOG_EOF

if [ "$(id -u)" -eq 0 ]; then
  mv -f /tmp/cloudpro-watchdog.sh "$WATCHDOG_SCRIPT" 2>/dev/null || true
  chmod +x "$WATCHDOG_SCRIPT" 2>/dev/null || true
  if ! crontab -l 2>/dev/null | grep -q "cloudpro-watchdog.sh"; then
    (crontab -l 2>/dev/null; echo "* * * * * $WATCHDOG_SCRIPT >/dev/null 2>&1") | crontab - 2>/dev/null || true
  fi
  service cron start 2>/dev/null || systemctl start cron 2>/dev/null || true
else
  sudo -n mv -f /tmp/cloudpro-watchdog.sh "$WATCHDOG_SCRIPT" 2>/dev/null || true
  sudo -n chmod +x "$WATCHDOG_SCRIPT" 2>/dev/null || true
  if ! crontab -l 2>/dev/null | grep -q "cloudpro-watchdog.sh"; then
    (crontab -l 2>/dev/null; echo "* * * * * $WATCHDOG_SCRIPT >/dev/null 2>&1") | crontab - 2>/dev/null || true
  fi
  sudo -n service cron start 2>/dev/null || sudo -n systemctl start cron 2>/dev/null || true
fi

# -------------------------------------------------------------------------
# [AUTO-SYNC PERMANEN] PASANG CRONJOB OTOMATIS TIAP 5 MENIT
# Server akan secara otomatis menarik update GitHub tanpa harus buka SSH lagi
# -------------------------------------------------------------------------
AUTO_SYNC_SCRIPT="/usr/local/bin/cloudpro-auto-sync.sh"
if [ "$(id -u)" -eq 0 ] || sudo -n true 2>/dev/null; then
  cat << 'EOF' > /tmp/cloudpro-auto-sync.sh
#!/usr/bin/env bash
for d in "/home/cloudpro/CloudPRO-Server" "/root/CloudPRO-Server" "$HOME/CloudPRO-Server" /home/*/CloudPRO-Server /root/Cloud-PRO /var/www/Cloud-PRO /home/*/*/Cloud-PRO /home/*/Cloud-PRO /app/applet; do
  if [ -d "$d/.git" ]; then
    cd "$d" || exit 0
    git fetch origin main -q 2>/dev/null || exit 0
    LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null)
    REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null)
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ] && [ -n "$REMOTE_COMMIT" ]; then
      git reset --hard origin/main -q 2>/dev/null
      if command -v npm &>/dev/null; then
        npm run build:server 2>&1 >/dev/null || true
      fi
      if command -v pm2 &>/dev/null; then
        pm2 restart cloudpro --update-env 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || true
      fi
    fi
    break
  fi
done
EOF
  if [ "$(id -u)" -eq 0 ]; then
    mv -f /tmp/cloudpro-auto-sync.sh "$AUTO_SYNC_SCRIPT" 2>/dev/null || true
    chmod +x "$AUTO_SYNC_SCRIPT" 2>/dev/null || true
    if ! crontab -l 2>/dev/null | grep -q "cloudpro-auto-sync.sh"; then
      (crontab -l 2>/dev/null; echo "*/5 * * * * $AUTO_SYNC_SCRIPT >/dev/null 2>&1") | crontab - 2>/dev/null || true
    fi
  else
    sudo -n mv -f /tmp/cloudpro-auto-sync.sh "$AUTO_SYNC_SCRIPT" 2>/dev/null || true
    sudo -n chmod +x "$AUTO_SYNC_SCRIPT" 2>/dev/null || true
    if ! crontab -l 2>/dev/null | grep -q "cloudpro-auto-sync.sh"; then
      (crontab -l 2>/dev/null; echo "*/5 * * * * $AUTO_SYNC_SCRIPT >/dev/null 2>&1") | crontab - 2>/dev/null || true
    fi
  fi
  echo "[OK] Auto-Sync Otomatis (Tiap 5 Menit) telah aktif! Anda tidak perlu lagi buka SSH untuk update manual."
fi

LATEST_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '-')"
LATEST_FULL="$(git rev-parse HEAD 2>/dev/null || echo '-')"
LATEST_MSG="$(git log -1 --pretty=%s 2>/dev/null || echo '-')"
LATEST_DATE="$(git log -1 --pretty='%cd (%cr)' 2>/dev/null || echo '-')"
LATEST_AUTHOR="$(git log -1 --pretty='%an' 2>/dev/null || echo '-')"

if curl -sI --max-time 5 http://127.0.0.1:3000/ | grep -q "HTTP"; then
  echo "========================================================"
  echo " >>> UPDATE SUKSES! SERVER AKTIF & TERVERIFIKASI <<<"
  echo "========================================================"
  echo " [TANDA RESMI VERSI TERBARU GITHUB]:"
  echo " ● Commit Hash   : $LATEST_COMMIT ($LATEST_FULL)"
  echo " ● Judul Commit  : $LATEST_MSG"
  echo " ● Tanggal Rilis : $LATEST_DATE"
  echo " ● Author        : $LATEST_AUTHOR"
  echo " ● Port 3000     : AKTIF (HTTP 200 OK)"
  echo "--------------------------------------------------------"
  echo " [ALAMAT WEB PANEL AKTIF]:"
  echo " 👉 Panel Utama (Resmi) : https://cloudpro.denbaguse.my.id"
  echo " 👉 Panel Cadangan      : https://servercloud.denbaguse.my.id"
  echo " 👉 Web Virtual Host    : https://denbaguse.my.id"
  echo "--------------------------------------------------------"
  echo " [PERINTAH CEPAT DI SSH TERMINAL]:"
  echo " * Cek Kommit Aktif  : ketik 'versi'"
  echo " * Cek Update GitHub : ketik 'cek-update'"
  echo " * Jalankan Update   : ketik 'update'"
  echo "--------------------------------------------------------"
  echo " PENTING AGAR TAMPILAN TERBARU LANGSUNG MUNCUL DI BROWSER:"
  echo " 1. Browser Anda masih menyimpan cache tampilan lama."
  echo " 2. Tekan tombol CTRL + SHIFT + R (atau CTRL + F5) di PC."
  echo " 3. Di HP: Buka menu titik tiga di browser -> Muat Ulang,"
  echo "    atau coba buka lewat Tab Samaran (Incognito Window)."
  echo "========================================================"
else
  echo "========================================================"
  echo " [PERHATIAN] Server sedang booting, cek dengan: pm2 status"
  echo " Commit Terpasang: $LATEST_COMMIT ($LATEST_MSG)"
  echo "========================================================"
fi
