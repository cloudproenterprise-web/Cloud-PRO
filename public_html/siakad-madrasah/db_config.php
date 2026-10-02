<?php
// ====================================================================
// KONFIGURASI DATABASE MYSQL / MARIADB HOSTING (PLESK / CPANEL / DLL)
// ====================================================================
// PERLINDUNGAN TIMPA ZIP:
// Jika file db_config.local.php sudah ada, konfigurasi lokal tersebut
// akan diprioritaskan sehingga saat Anda menimpa/extract file ZIP baru
// di cPanel atau Plesk, kredensial dan koneksi database TIDAK AKAN HILANG.

if (file_exists(__DIR__ . '/db_config.local.php')) {
    include_once __DIR__ . '/db_config.local.php';
}

if (!defined('DB_HOST') && file_exists(__DIR__ . '/uploads/.db_config_backup.php')) {
    include_once __DIR__ . '/uploads/.db_config_backup.php';
}

// Nilai default hosting (hanya berlaku jika belum didefinisikan sebelumnya)
if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'jaenal_siakadmadrasah');
if (!defined('DB_USER')) define('DB_USER', 'jaenal_siakadmadrah');
if (!defined('DB_PASS')) define('DB_PASS', 'masbagus15');

