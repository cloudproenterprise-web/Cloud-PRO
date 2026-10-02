<?php
/**
 * Auto Extractor & Installer for Plesk / cPanel
 * Website Personal Ust. Jaenal Maskun, S.Pd.I.
 */
header('Content-Type: text/html; charset=utf-8');

$zipFiles = glob('*.zip');
$targetZip = null;

// Find zip file
if (file_exists('website-jaenal-plesk.zip')) {
    $targetZip = 'website-jaenal-plesk.zip';
} elseif (!empty($zipFiles)) {
    $targetZip = $zipFiles[0];
}

$message = '';
$status = 'idle';

if (isset($_POST['extract'])) {
    if (!$targetZip || !file_exists($targetZip)) {
        $message = "File ZIP tidak ditemukan di folder ini. Pastikan file ZIP sudah diunggah ke httpdocs.";
        $status = 'error';
    } else {
        if (!class_exists('ZipArchive')) {
            $message = "Ekstensi PHP ZipArchive tidak aktif di server ini. Silakan ekstrak file ZIP di komputer Anda lalu upload isinya langsung.";
            $status = 'error';
        } else {
            $zip = new ZipArchive();
            $res = $zip->open($targetZip);
            if ($res === TRUE) {
                $zip->extractTo(__DIR__);
                $zip->close();
                $message = "BERHASIL! Seluruh berkas website berhasil diekstrak ke server!";
                $status = 'success';
            } else {
                $message = "Gagal membuka file ZIP (Kode Error: $res). Pastikan file ZIP sudah selesai diunggah 100%.";
                $status = 'error';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto-Extractor Website Ust. Jaenal Maskun</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-emerald-950 text-white min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="max-w-md w-full bg-emerald-900/90 border border-amber-400/40 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
    <div class="text-center mb-6">
      <span class="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-1">Plesk Auto Extractor</span>
      <h1 class="text-xl font-extrabold text-white">Ekstraktor Website Otomatis</h1>
      <p class="text-xs text-emerald-200 mt-1">Ust. Jaenal Maskun, S.Pd.I.</p>
    </div>

    <?php if ($status === 'success'): ?>
      <div class="bg-emerald-800 border border-emerald-400 text-emerald-100 p-4 rounded-2xl mb-6 text-sm">
        <p class="font-bold text-amber-300 mb-1">🎉 <?php echo $message; ?></p>
        <p class="text-xs text-emerald-200">Semua file (index.html, api, assets, database.sql, data) sudah aktif di folder server.</p>
      </div>
      <div class="space-y-3">
        <a href="index.html" class="block w-full py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-center rounded-xl text-sm transition-all shadow-md">
          Buka Website Sekarang &rarr;
        </a>
        <p class="text-[11px] text-center text-emerald-300">Catatan: Anda dapat menghapus file <code class="bg-emerald-950 px-1 py-0.5 rounded">unzip.php</code> setelah selesai.</p>
      </div>
    <?php else: ?>
      <?php if ($status === 'error'): ?>
        <div class="bg-red-900/80 border border-red-400 text-red-100 p-4 rounded-2xl mb-6 text-xs leading-relaxed">
          <strong class="font-bold block text-red-200 mb-1">Terjadi Kendala:</strong>
          <?php echo $message; ?>
        </div>
      <?php endif; ?>

      <div class="bg-emerald-950/60 rounded-2xl p-4 border border-emerald-800 text-xs space-y-2 mb-6">
        <div class="flex justify-between">
          <span class="text-emerald-300">File ZIP Terdeteksi:</span>
          <span class="font-mono font-bold text-amber-300"><?php echo $targetZip ? $targetZip : 'Belum Terdeteksi'; ?></span>
        </div>
        <div class="flex justify-between">
          <span class="text-emerald-300">Status Server:</span>
          <span class="text-emerald-200"><?php echo class_exists('ZipArchive') ? '✅ ZipArchive Aktif' : '❌ ZipArchive Nonaktif'; ?></span>
        </div>
      </div>

      <form method="POST">
        <button type="submit" name="extract" class="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-sm rounded-xl transition-all shadow-lg active:scale-95">
          🚀 Ekstrak File ZIP Sekarang
        </button>
      </form>
    <?php endif; ?>
  </div>
</body>
</html>
