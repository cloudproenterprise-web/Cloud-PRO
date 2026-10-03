import os from 'os';

export function renderWebTerminalHtml(host: string, initialCwd: string): string {
  const hostname = os.hostname() || 'linux-server';
  const username = os.userInfo()?.username || 'cloudpro';
  const platform = `${os.type()} ${os.release()} (${os.arch()})`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>CloudPRO Web SSH Terminal — ${host}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; width: 100%; background: #07090e; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.5; overflow: hidden; }
    
    /* Layout */
    .app-container { display: flex; flex-direction: column; height: 100vh; height: 100dvh; }
    
    /* Header */
    .terminal-header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      gap: 12px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .status-dot { width: 9px; height: 9px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; flex-shrink: 0; }
    .header-title { font-weight: 700; font-size: 14px; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-badge { font-size: 11px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 2px 7px; font-weight: 600; }
    .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .btn-header {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .btn-header:hover { background: #334155; color: #f8fafc; }
    
    /* Quick Action Buttons (Mobile Friendly) */
    .quick-bar {
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
      padding: 8px 12px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .quick-bar::-webkit-scrollbar { display: none; }
    .quick-btn {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .quick-btn:active, .quick-btn:hover { background: #0284c7; border-color: #38bdf8; color: #fff; transform: translateY(-1px); }
    .quick-btn.danger:hover { background: #dc2626; border-color: #f87171; }
    
    /* Terminal Output Screen */
    .terminal-screen {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      overflow-x: auto;
      background: #050811;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scroll-behavior: smooth;
    }
    .terminal-screen::-webkit-scrollbar { width: 6px; height: 6px; }
    .terminal-screen::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    
    .banner {
      color: #94a3b8;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 14px;
      background: rgba(15, 23, 42, 0.6);
      margin-bottom: 12px;
      font-size: 12px;
    }
    .banner-title { color: #38bdf8; font-weight: 700; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .banner-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; color: #64748b; font-size: 11px; }
    .banner-grid strong { color: #cbd5e1; font-weight: 600; }
    
    .history-block { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .cmd-line { display: flex; align-items: baseline; gap: 8px; font-weight: 600; flex-wrap: wrap; }
    .prompt-user { color: #10b981; }
    .prompt-sep { color: #64748b; }
    .prompt-path { color: #38bdf8; }
    .prompt-sym { color: #f59e0b; }
    .cmd-text { color: #f8fafc; font-weight: 700; word-break: break-all; }
    
    .output-text {
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-all;
      padding-left: 12px;
      border-left: 2px solid #1e293b;
      margin-top: 4px;
      font-size: 12.5px;
    }
    .output-text.error { border-left-color: #ef4444; color: #fca5a5; }
    .output-text.success { border-left-color: #10b981; }
    
    /* Interactive Input Row */
    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #090e1a;
      border-top: 1px solid #1e293b;
      padding: 10px 14px;
      flex-shrink: 0;
    }
    .input-prompt { font-weight: 700; color: #10b981; white-space: nowrap; font-size: 12px; display: flex; align-items: center; gap: 4px; }
    .input-prompt span { color: #38bdf8; }
    .cmd-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13.5px;
      font-weight: 600;
      width: 100%;
    }
    .btn-send {
      background: #0284c7;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: background 0.15s;
    }
    .btn-send:hover { background: #0369a1; }
    
    /* Virtual Mobile Keyboard Row */
    .mobile-keys {
      background: #0b1120;
      border-top: 1px solid #1e293b;
      padding: 6px 10px;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .mobile-keys::-webkit-scrollbar { display: none; }
    .m-key {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px 11px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }
    .m-key:active { background: #38bdf8; color: #0b1120; }
    
    /* Security Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 18, 0.88);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 100;
    }
    .modal-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 20px;
      max-width: 400px;
      width: 100%;
      padding: 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      text-align: center;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .modal-icon { width: 54px; height: 54px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #38bdf8; font-size: 24px; }
    .modal-title { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .modal-desc { font-size: 12px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
    .pin-input {
      width: 100%;
      background: #090d16;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px 16px;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      letter-spacing: 2px;
      text-align: center;
      outline: none;
      margin-bottom: 16px;
    }
    .pin-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
    .btn-unlock {
      width: 100%;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-unlock:hover { opacity: 0.95; }
    .default-hint { font-size: 11px; color: #64748b; margin-top: 12px; }
    .default-hint strong { color: #38bdf8; cursor: pointer; text-decoration: underline; }
    
    /* ANSI colors */
    .ansi-green { color: #34d399; }
    .ansi-red { color: #f87171; }
    .ansi-yellow { color: #fbbf24; }
    .ansi-blue { color: #60a5fa; }
    .ansi-cyan { color: #38bdf8; }
    .ansi-magenta { color: #c084fc; }
    .ansi-bold { font-weight: bold; }
    
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #38bdf8; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-left: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <header class="terminal-header">
      <div class="header-left">
        <div class="status-dot"></div>
        <div class="header-title">CloudPRO Web SSH</div>
        <div class="header-badge">${username}@${hostname}</div>
      </div>
      <div class="header-right">
        <button class="btn-header" onclick="clearTerminal()" title="Bersihkan Layar">🧹 Clear</button>
        <button class="btn-header" onclick="lockTerminal()" title="Kunci Terminal">🔒 Kunci</button>
        <a class="btn-header" href="/?panel=1" onclick="window.location.href='/?v=' + Date.now() + '&panel=1'; return false;" style="text-decoration:none; background:#f59e0b; color:#0f172a; font-weight:800;">⚡ Panel</a>
      </div>
    </header>

    <!-- Quick Action Pills for Mobile -->
    <div class="quick-bar">
      <button class="quick-btn" onclick="runCommand('bash update.sh')">🚀 1-Click Update</button>
      <button class="quick-btn" onclick="runCommand('bash update.sh --check')">🔍 Cek Kommit GitHub</button>
      <button class="quick-btn" onclick="runCommand('git log -1 --pretty=format:\"Commit: %h%nJudul  : %s%nWaktu  : %cd (%cr)%nAuthor : %an\"')">🏷️ Versi Aktif</button>
      <button class="quick-btn" onclick="runCommand('for h in /root /home/*; do [ -d \"$h\" ] && for f in .bashrc .profile .bash_profile; do [ -f \"$h/$f\" ] && sed -i \"s/\\r$//\" \"$h/$f\" && sed -i -E \"s/^[[:space:]]*(exit|logout|exec |source .*update|\\. .*update|fuser -k|\\.?\\/?update\\.sh)/# [Auto-Heal] &/\" \"$h/$f\"; done; done; mkdir -p /run/sshd 2>/dev/null; service ssh start 2>/dev/null || true; echo \"[OK] Terminal Ubuntu & SSH di Komputer berhasil diperbaiki! Silakan buka kembali aplikasi Ubuntu di PC.\"')">🛠️ Perbaiki SSH PC</button>
      <button class="quick-btn" onclick="runCommand('pm2 status')">📊 PM2 Status</button>
      <button class="quick-btn" onclick="runCommand('pm2 restart cloudpro')">🔄 PM2 Restart</button>
      <button class="quick-btn" onclick="runCommand('pm2 logs cloudpro --lines 25')">📜 PM2 Logs</button>
      <button class="quick-btn" onclick="runCommand('git status -s')">📁 Git Status</button>
      <button class="quick-btn" onclick="runCommand('git pull origin main || (git fetch origin main && git reset --hard FETCH_HEAD)')">⬇️ Git Pull</button>
      <button class="quick-btn" onclick="runCommand('free -h && echo \"---\" && df -h /')">💾 RAM & Disk</button>
      <button class="quick-btn" onclick="runCommand('lsof -i :3000 || netstat -tlpn | grep 3000')">🔌 Cek Port 3000</button>
      <button class="quick-btn" onclick="runCommand('ps aux | grep -E \"server.js|cloudpro\" | grep -v grep')">⚙️ Cek Proses Node</button>
      <button class="quick-btn" onclick="runCommand('pwd')">📂 Cek Direktori CWD</button>
    </div>

    <!-- Terminal Screen -->
    <div class="terminal-screen" id="terminalScreen">
      <div class="banner">
        <div class="banner-title">
          <span>⚡ CloudPRO Direct Web Terminal (No-Tailscale Mode)</span>
        </div>
        <div class="banner-grid">
          <div>Platform:</div><strong>${platform}</strong>
          <div>User & Host:</div><strong>${username}@${hostname}</strong>
          <div>Root CWD:</div><strong id="bannerCwd">${initialCwd}</strong>
          <div>Status:</div><strong style="color:#10b981;">Terhubung Langsung ke Linux Bash</strong>
        </div>
        <div style="margin-top:8px; font-size:11px; color:#94a3b8;">
          Ketik perintah bash langsung seperti di console Tailscale/PuTTY. Tombol pintas cepat tersedia di atas layar.
        </div>
      </div>
      <div id="outputHistory"></div>
    </div>

    <!-- Virtual Mobile Keys -->
    <div class="mobile-keys">
      <button class="m-key" onclick="insertChar('\t')">Tab</button>
      <button class="m-key" onclick="handleCtrlC()">Ctrl+C</button>
      <button class="m-key" onclick="navHistory(-1)">▲ History</button>
      <button class="m-key" onclick="navHistory(1)">▼ History</button>
      <button class="m-key" onclick="insertChar('/')">/</button>
      <button class="m-key" onclick="insertChar('-')">-</button>
      <button class="m-key" onclick="insertChar('~')">~</button>
      <button class="m-key" onclick="insertChar('|')">|</button>
      <button class="m-key" onclick="insertChar(' && ')">&&</button>
      <button class="m-key" onclick="insertChar('sudo ')">sudo</button>
    </div>

    <!-- Input Row -->
    <div class="input-row">
      <div class="input-prompt" id="activePrompt">${username}@host:<span>~</span>$</div>
      <input
        type="text"
        id="cmdInput"
        class="cmd-input"
        placeholder="Ketik perintah... (contoh: pm2 status, ls -la)"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button class="btn-send" id="btnSend" onclick="submitCommand()">Kirim</button>
    </div>
  </div>

  <!-- Security PIN Modal -->
  <div class="modal-overlay" id="pinModal" style="display:none;">
    <div class="modal-card">
      <div class="modal-icon">🔐</div>
      <div class="modal-title">CloudPRO Web SSH</div>
      <div class="modal-desc">
        Akses langsung shell Linux tanpa login Tailscale. Masukkan PIN keamanan untuk membuka terminal.
      </div>
      <input
        type="password"
        id="pinInput"
        class="pin-input"
        placeholder="Masukkan PIN"
        maxlength="32"
        autofocus
      />
      <button class="btn-unlock" onclick="unlockTerminal()">Buka Terminal</button>
      <div class="default-hint">
        PIN Bawaan: <strong onclick="useDefaultPin()">cloudpro</strong> (Klik untuk isi)
      </div>
    </div>
  </div>

  <script>
    let currentCwd = '${initialCwd}';
    let history = [];
    let historyIndex = -1;
    let isRunning = false;
    let terminalPin = localStorage.getItem('cloudpro_terminal_pin') || '';

    const cmdInput = document.getElementById('cmdInput');
    const outputHistory = document.getElementById('outputHistory');
    const terminalScreen = document.getElementById('terminalScreen');
    const activePrompt = document.getElementById('activePrompt');
    const pinModal = document.getElementById('pinModal');
    const pinInput = document.getElementById('pinInput');

    function safeFocus(el) {
      if (!el) return;
      if (!('ontouchstart' in window) && !window.matchMedia('(pointer: coarse)').matches) {
        try { el.focus(); } catch {}
      }
    }

    function updatePrompt(cwd) {
      currentCwd = cwd;
      const shortCwd = cwd.length > 28 ? '...' + cwd.slice(-25) : cwd;
      activePrompt.innerHTML = '${username}@host:<span>' + shortCwd + '</span>$';
    }

    function checkAuth() {
      if (!terminalPin) {
        pinModal.style.display = 'flex';
        safeFocus(pinInput);
      } else {
        pinModal.style.display = 'none';
        safeFocus(cmdInput);
      }
    }

    function useDefaultPin() {
      pinInput.value = 'cloudpro';
    }

    function unlockTerminal() {
      const pin = pinInput.value.trim();
      if (!pin) return;
      terminalPin = pin;
      localStorage.setItem('cloudpro_terminal_pin', pin);
      pinModal.style.display = 'none';
      safeFocus(cmdInput);
      runCommand('pwd');
    }

    function lockTerminal() {
      localStorage.removeItem('cloudpro_terminal_pin');
      terminalPin = '';
      pinInput.value = '';
      pinModal.style.display = 'flex';
      safeFocus(pinInput);
    }

    function insertChar(ch) {
      if (!cmdInput) return;
      cmdInput.value += ch;
      safeFocus(cmdInput);
    }

    function handleCtrlC() {
      if (!cmdInput) return;
      appendHistoryBlock(cmdInput.value || '^C', '^C (Perintah diinterupsi)', false);
      cmdInput.value = '';
      isRunning = false;
    }

    function clearTerminal() {
      if (outputHistory) outputHistory.innerHTML = '';
      safeFocus(cmdInput);
    }

    function navHistory(dir) {
      if (history.length === 0) return;
      historyIndex += dir;
      if (historyIndex < 0) historyIndex = 0;
      if (historyIndex >= history.length) {
        historyIndex = history.length;
        cmdInput.value = '';
        return;
      }
      cmdInput.value = history[historyIndex];
    }

    function ansiToHtml(text) {
      if (!text) return '';
      let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Strip ANSI cursor positioning and clear codes
      escaped = escaped.replace(/\\x1b\\[[0-9;]*[HJKsu]/g, '');

      // Convert common ANSI color codes
      escaped = escaped
        .replace(/\\x1b\\[0m/g, '</span>')
        .replace(/\\x1b\\[1m/g, '<span class="ansi-bold">')
        .replace(/\\x1b\\[31m/g, '<span class="ansi-red">')
        .replace(/\\x1b\\[32m/g, '<span class="ansi-green">')
        .replace(/\\x1b\\[33m/g, '<span class="ansi-yellow">')
        .replace(/\\x1b\\[34m/g, '<span class="ansi-blue">')
        .replace(/\\x1b\\[35m/g, '<span class="ansi-magenta">')
        .replace(/\\x1b\\[36m/g, '<span class="ansi-cyan">')
        .replace(/\\x1b\\[90m/g, '<span style="color:#64748b;">')
        .replace(/\\x1b\\[92m/g, '<span class="ansi-green">')
        .replace(/\\x1b\\[93m/g, '<span class="ansi-yellow">')
        .replace(/\\x1b\\[96m/g, '<span class="ansi-cyan">')
        .replace(/\\x1b\\[[0-9;]*m/g, ''); // strip any remaining

      return escaped;
    }

    function appendHistoryBlock(cmd, output, isError, exitCode) {
      const block = document.createElement('div');
      block.className = 'history-block';

      const cmdLine = document.createElement('div');
      cmdLine.className = 'cmd-line';
      cmdLine.innerHTML =
        '<span class="prompt-user">${username}@host</span>' +
        '<span class="prompt-sep">:</span>' +
        '<span class="prompt-path">' + currentCwd + '</span>' +
        '<span class="prompt-sym">$</span>' +
        '<span class="cmd-text">' + cmd + '</span>' +
        (exitCode !== undefined
          ? (exitCode === 0
              ? ' <span style="color:#10b981;font-size:11px;">✓</span>'
              : ' <span style="color:#ef4444;font-size:11px;">✗ (' + exitCode + ')</span>')
          : '');

      block.appendChild(cmdLine);

      if (output && output.trim()) {
        const outDiv = document.createElement('div');
        outDiv.className = 'output-text' + (isError ? ' error' : '');
        outDiv.innerHTML = ansiToHtml(output);
        block.appendChild(outDiv);
      }

      outputHistory.appendChild(block);
      terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }

    async function executeApi(cmd) {
      if (isRunning) return;
      isRunning = true;
      document.getElementById('btnSend').disabled = true;

      // Temporary running indicator
      const tempBlock = document.createElement('div');
      tempBlock.className = 'history-block';
      tempBlock.id = 'activeRunningBlock';
      tempBlock.innerHTML =
        '<div class="cmd-line"><span class="prompt-user">${username}@host</span><span class="prompt-sep">:</span><span class="prompt-path">' +
        currentCwd +
        '</span><span class="prompt-sym">$</span><span class="cmd-text">' +
        cmd +
        '</span> <div class="spinner"></div></div>';
      outputHistory.appendChild(tempBlock);
      terminalScreen.scrollTop = terminalScreen.scrollHeight;

      try {
        const res = await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-terminal-pin': terminalPin,
          },
          body: JSON.stringify({ command: cmd, cwd: currentCwd }),
        });

        const rawText = await res.text();
        tempBlock.remove();

        if (res.status === 401) {
          alert('PIN Terminal Salah! Silakan masukkan PIN yang benar.');
          lockTerminal();
          return;
        }

        let data;
        try {
          data = JSON.parse(rawText);
        } catch (jsonErr) {
          // If server reloaded during update/restart and connection returned HTML
          if (cmd.includes('update') || cmd.includes('restart') || cmd.includes('pm2') || rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            appendHistoryBlock(
              cmd,
              '⚡ [INFO] Perintah update / restart sedang dieksekusi di background server...\\n' +
              'Service PM2 sedang me-reload process CloudPRO.\\n' +
              'Menghubungi ulang server dalam 3 detik...',
              false,
              0
            );
            setTimeout(async () => {
              try {
                const check = await fetch('/');
                if (check.ok || check.status < 500) {
                  appendHistoryBlock('status', '✅ [SUKSES] Server CloudPRO telah aktif kembali dan siap melayani!', false, 0);
                }
              } catch (e) {}
            }, 3500);
            return;
          }
          throw new Error(rawText.slice(0, 160) || 'Format respon tidak valid');
        }

        if (data.clear) {
          outputHistory.innerHTML = '';
        } else {
          const finalOutput = (data.stdout || '') + (data.stderr ? '\\n[STDERR] ' + data.stderr : '');
          appendHistoryBlock(cmd, finalOutput, !data.ok, data.exitCode);
        }

        if (data.cwd) {
          updatePrompt(data.cwd);
        }
      } catch (err) {
        tempBlock.remove();
        if (cmd.includes('update') || cmd.includes('restart')) {
          appendHistoryBlock(
            cmd,
            '⚡ [INFO] Server CloudPRO sedang me-restart service di background.\\n' +
            'Silakan refresh browser beberapa detik lagi untuk melihat versi terbaru.',
            false,
            0
          );
        } else {
          appendHistoryBlock(cmd, 'Koneksi gagal atau server terputus: ' + err.message, true, 1);
        }
      } finally {
        isRunning = false;
        document.getElementById('btnSend').disabled = false;
        safeFocus(cmdInput);
      }
    }

    function runCommand(cmd) {
      if (!cmd || isRunning) return;
      cmdInput.value = '';
      history.push(cmd);
      historyIndex = history.length;
      executeApi(cmd);
    }

    function submitCommand() {
      const cmd = cmdInput.value.trim();
      if (!cmd) return;
      runCommand(cmd);
    }

    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navHistory(1);
      } else if (e.key === 'c' && e.ctrlKey) {
        handleCtrlC();
      }
    });

    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlockTerminal();
    });

    // Auto init
    updatePrompt(currentCwd);
    checkAuth();
  </script>
</body>
</html>`;
}
