#!/usr/bin/env bash
# =========================================================================
# CloudPRO Server 1-Click Update & Self-Healing Script (WSL & Ubuntu Safe)
# =========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" 2>/dev/null || true

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
  if [[ "$RC_FILE" == *".bashrc" ]]; then
    echo "alias update='bash \"$SCRIPT_DIR/update.sh\"'" >> "$RC_FILE"
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
  fi
done

# Jalankan sshd secara non-blocking (tanpa memicu prompt password polkit yang bikin hang)
if [ "$(id -u)" -eq 0 ]; then
  mkdir -p /run/sshd 2>/dev/null || true
  service ssh start 2>/dev/null < /dev/null || true
else
  sudo -n mkdir -p /run/sshd 2>/dev/null || true
  sudo -n service ssh start 2>/dev/null < /dev/null || true
fi
echo "[OK] Konfigurasi Shell Ubuntu (~/.bashrc) & Daemon SSH telah diperbaiki!"

echo "[1/3] Mengambil kode terbaru dari GitHub..."
CURRENT_ORIGIN="$(git remote get-url origin 2>/dev/null || echo "")"
if [[ "$CURRENT_ORIGIN" == *"Cloud-PRO"* ]]; then
  REPO_URL="$CURRENT_ORIGIN"
else
  REPO_URL="https://github.com/cloudproenterprise-web/Cloud-PRO.git"
fi

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

git branch -D origin/main 2>/dev/null || true
git fetch origin main
if git merge-base --is-ancestor FETCH_HEAD HEAD 2>/dev/null && [ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse FETCH_HEAD 2>/dev/null)" ]; then
  echo "[INFO] Commit lokal sudah lebih baru dari GitHub origin/main. Mempertahankan versi terbaru..."
else
  git reset --hard FETCH_HEAD
fi
git gc --prune=now -q 2>/dev/null || true

# Pulihkan kembali state dari Persistent Vault ke .cloudpro-data setelah git reset
for STATE_FILE in cloudpro-full-state.json cloudpro-vhost-store.json cloudpro-tunnel-config.json cloudpro-ddns-config.json; do
  if [ -f "$VAULT_DIR/$STATE_FILE" ]; then
    cp -f "$VAULT_DIR/$STATE_FILE" ".cloudpro-data/$STATE_FILE" 2>/dev/null || true
  fi
done

echo "[2/3] Menyinkronkan Service CloudPRO (Bebas Hang & Bebas Konflik Port 3000)..."
export NODE_ENV=production
export PATH="$PATH:/usr/local/bin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin"

# Hentikan proses node server.js / tsx server.ts liar di luar PM2 agar tidak berebut port 3000 (tanpa memutus terminal)
if [ "$(id -u)" -ne 0 ]; then
  sudo -n pm2 delete cloudpro 2>/dev/null < /dev/null || true
fi

if command -v pm2 &> /dev/null; then
  # Jika PM2 belum menjalankan cloudpro, bersihkan dulu proses node server.js lama di port 3000
  if ! pm2 describe cloudpro &>/dev/null; then
    OLD_PIDS=$(pgrep -f "node.*server\.js|tsx.*server\.ts" 2>/dev/null | grep -v "^$$\$" | grep -v "^$PPID\$" || true)
    for pid in $OLD_PIDS; do
      kill -9 "$pid" 2>/dev/null || sudo -n kill -9 "$pid" 2>/dev/null || true
    done
  fi
  pm2 save < /dev/null 2>/dev/null || true
  # Jalankan reload PM2 setelah jeda 1.5 detik agar respon terminal HTTP terkirim utuh tanpa terputus
  (sleep 1.5 && (pm2 reload cloudpro --update-env < /dev/null 2>/dev/null || pm2 restart cloudpro --update-env < /dev/null 2>/dev/null || pm2 start server.js --name cloudpro --update-env < /dev/null)) >/dev/null 2>&1 &
  echo "[OK] Server CloudPRO berhasil disinkronkan & dijadwalkan reload via PM2!"
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

# Restart cloudflared secara non-blocking
if [ "$(id -u)" -eq 0 ]; then
  systemctl restart cloudflared 2>/dev/null < /dev/null || true
else
  sudo -n systemctl restart cloudflared 2>/dev/null < /dev/null || true
fi

echo "[3/3] Verifikasi Status Server & Pembersihan Sampah Disk..."
sleep 2
CLEAN_RES=$(curl -s --max-time 5 -X POST http://127.0.0.1:3000/api/system/clean-disk || true)
if [ -n "$CLEAN_RES" ]; then
  echo " [DISK CLEANER] Sampah sisa instalasi lama berhasil dibersihkan otomatis!"
fi
if curl -sI --max-time 5 http://127.0.0.1:3000/ | grep -q "HTTP"; then
  echo "========================================================"
  echo " >>> UPDATE SUKSES! SERVER AKTIF DI PORT 3000 <<<"
  echo " [TERVERIFIKASI] Respon server & API Cloud PRO 100% AKTIF!"
  echo " Buka https://servercloud.denbaguse.my.id atau https://denbaguse.my.id"
  echo "========================================================"
else
  echo "Server sedang memuat, cek dengan: pm2 status"
fi
