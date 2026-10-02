<?php
/**
 * Konfigurasi Database MySQL Hosting Plesk & cPanel
 * Website Personal Ust. Jaenal Maskun, S.Pd.I.
 */
define('DB_HOST', 'localhost');
define('DB_USER', 'jaenal_masterwebsite');
define('DB_PASS', 'masbagus15');
define('DB_NAME', 'jaenal_masterwebsite');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

function getDbConnection($throwOnError = false) {
    static $pdo = null;
    static $attempted = false;
    if ($pdo === null && !$attempted) {
        $attempted = true;
        // Fast guard: If default dummy/placeholder credentials are present, skip connection immediately without blocking timeout
        if (empty(DB_USER) || strpos(DB_USER, 'u1234567_') !== false || empty(DB_NAME) || strpos(DB_NAME, 'u1234567_') !== false) {
            return null;
        }
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => 1,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (Exception $e) {
            $pdo = null;
            if ($throwOnError) {
                throw $e;
            }
        }
    }
    return $pdo;
}

function ensureDatabaseTablesExist($pdo) {
    if (!$pdo) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `site_settings` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `setting_key` varchar(100) NOT NULL UNIQUE,
          `setting_value` LONGTEXT NOT NULL,
          `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS `messages` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `msg_id` varchar(50) NOT NULL UNIQUE,
          `sender` varchar(150) NOT NULL,
          `institution` varchar(200) DEFAULT NULL,
          `email` varchar(150) DEFAULT NULL,
          `phone` varchar(50) DEFAULT NULL,
          `event_type` varchar(100) DEFAULT 'Silaturahmi',
          `event_date` varchar(100) DEFAULT NULL,
          `message` text NOT NULL,
          `is_read` tinyint(1) NOT NULL DEFAULT 0,
          `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    } catch (Exception $e) {}
}
?>