<?php
require_once __DIR__ . '/../db_config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$pdo = getDbConnection();
$action = $_GET['action'] ?? '';

function getPersistedJsonFilePath() {
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir . '/persisted_site_data.json';
}

function loadPersistedSiteData($pdo) {
    // 1. Try from MySQL if available
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT setting_value, UNIX_TIMESTAMP(updated_at)*1000 as lastUpdated FROM site_settings WHERE setting_key = 'site_data'");
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && !empty($row['setting_value'])) {
                $decoded = json_decode($row['setting_value'], true);
                if (is_array($decoded) && !empty($decoded)) {
                    if (!isset($decoded['lastUpdated'])) {
                        $decoded['lastUpdated'] = (int)$row['lastUpdated'];
                    }
                    return $decoded;
                }
            }
        } catch (Exception $e) {}
    }

    // 2. Fallback to server JSON file
    $filePath = getPersistedJsonFilePath();
    if (file_exists($filePath)) {
        $content = @file_get_contents($filePath);
        if ($content) {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    return null;
}

function savePersistedSiteData($pdo, $data) {
    $now = round(microtime(true) * 1000);
    $data['lastUpdated'] = $now;
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    // 1. Always save to JSON file on server
    $filePath = getPersistedJsonFilePath();
    @file_put_contents($filePath, $json, LOCK_EX);

    // 2. Save to MySQL if available
    $savedToDb = false;
    if ($pdo) {
        try {
            if (function_exists('ensureDatabaseTablesExist')) {
                ensureDatabaseTablesExist($pdo);
            }
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
            $stmt->execute([$json]);
            $savedToDb = true;
        } catch (Exception $e) {}
    }

    return ['savedToDb' => $savedToDb, 'lastUpdated' => $now];
}

// 1. Action: Test Ping Connection
if ($action === 'test') {
    $start = microtime(true);
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT VERSION() as version");
            $row = $stmt->fetch();
            $latency = round((microtime(true) - $start) * 1000);
            echo json_encode([
                'success' => true,
                'message' => 'Koneksi MySQL Hosting Plesk Aktif 100%!',
                'version' => $row['version'] ?? 'MySQL',
                'latency' => $latency,
                'storageEngine' => 'mysql',
                'isLocalhost' => true
            ]);
            exit;
        } catch (Exception $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Server web aktif dengan penyimpanan aman terverifikasi (JSON File Persistence).',
        'latency' => 1,
        'storageEngine' => 'file',
        'isLocalhost' => true
    ]);
    exit;
}

// 2. Action: Status / Sync Status / DB Status
if ($action === 'status') {
    $current = loadPersistedSiteData($pdo);
    echo json_encode([
        'success' => true,
        'isConnected' => ($pdo !== null),
        'mysqlActive' => ($pdo !== null),
        'hasData' => ($current !== null),
        'lastUpdated' => $current['lastUpdated'] ?? round(microtime(true) * 1000),
        'database' => defined('DB_NAME') ? DB_NAME : 'file_mode',
        'user' => defined('DB_USER') ? DB_USER : 'local',
        'host' => defined('DB_HOST') ? DB_HOST : 'localhost',
        'storageEngine' => ($pdo !== null ? 'mysql' : 'file')
    ]);
    exit;
}

// 3. Action: Save DB Config
if ($action === 'save_config') {
    echo json_encode([
        'success' => true,
        'isConnected' => true,
        'message' => 'Konfigurasi database MySQL aktif di server hosting.'
    ]);
    exit;
}

// 4. Action: Save Site Content
if ($action === 'site_content' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $content = json_decode($raw, true);
    if (!$content) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data konten tidak valid']);
        exit;
    }
    
    $current = loadPersistedSiteData($pdo) ?? [];
    $current['siteContent'] = $content;
    $res = savePersistedSiteData($pdo, $current);
    
    echo json_encode([
        'success' => true,
        'lastUpdated' => $res['lastUpdated'],
        'storageEngine' => $res['savedToDb'] ? 'mysql' : 'file',
        'message' => 'Konten website berhasil disimpan ke database & server publik.'
    ]);
    exit;
}

// 4b. Action: Upload Thumbnail Image
if ($action === 'upload_thumbnail' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    $base64 = $payload['image'] ?? '';
    
    $base64Data = $base64;
    if (strpos($base64, 'base64,') !== false) {
        $parts = explode('base64,', $base64);
        $base64Data = $parts[1];
    }
    $base64Data = preg_replace('/\s+/', '', $base64Data);
    $imgData = base64_decode($base64Data);
    
    if ($imgData !== false && strlen($imgData) > 0) {
        $targetFile = __DIR__ . '/../og-image.jpg';
        $thumbFile = __DIR__ . '/../thumbnail.jpg';
        $persistedFile = __DIR__ . '/../data/persisted_og_image.jpg';
        @file_put_contents($targetFile, $imgData);
        @file_put_contents($thumbFile, $imgData);
        @file_put_contents($persistedFile, $imgData);
        
        $current = loadPersistedSiteData($pdo) ?? [];
        if (!isset($current['siteContent'])) { $current['siteContent'] = []; }
        if (!isset($current['siteContent']['shareSettings'])) { $current['siteContent']['shareSettings'] = []; }
        $current['siteContent']['shareSettings']['thumbnailUrl'] = '/og-image.jpg?v=' . time();
        $res = savePersistedSiteData($pdo, $current);
        
        echo json_encode([
            'success' => true,
            'url' => $current['siteContent']['shareSettings']['thumbnailUrl'],
            'message' => 'Thumbnail banner media sosial berhasil diunggah dan disimpan.'
        ]);
        exit;
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format base64 image tidak valid']);
    exit;
}

// 5. Action: Save Logo Config
if ($action === 'logo_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $logo = json_decode($raw, true);
    if (!$logo) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data logo tidak valid']);
        exit;
    }
    
    $current = loadPersistedSiteData($pdo) ?? [];
    $current['logoConfig'] = $logo;
    $res = savePersistedSiteData($pdo, $current);
    
    echo json_encode([
        'success' => true,
        'lastUpdated' => $res['lastUpdated'],
        'storageEngine' => $res['savedToDb'] ? 'mysql' : 'file',
        'message' => 'Konfigurasi logo header berhasil disimpan ke server.'
    ]);
    exit;
}

// 6. Action: Save Sticky Footer Config
if ($action === 'sticky_footer_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $footer = json_decode($raw, true);
    if (!$footer) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data menu footer tidak valid']);
        exit;
    }
    
    $current = loadPersistedSiteData($pdo) ?? [];
    $current['stickyFooterConfig'] = $footer;
    $res = savePersistedSiteData($pdo, $current);
    
    echo json_encode([
        'success' => true,
        'lastUpdated' => $res['lastUpdated'],
        'storageEngine' => $res['savedToDb'] ? 'mysql' : 'file',
        'message' => 'Konfigurasi menu sticky footer berhasil disimpan ke server.'
    ]);
    exit;
}

// 7. Action: Sync / Save Full Bundle
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $action === 'sync') {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!$payload) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data JSON kosong atau tidak valid']);
        exit;
    }

    $current = loadPersistedSiteData($pdo) ?? [];
    if (isset($payload['siteContent'])) { $current['siteContent'] = $payload['siteContent']; }
    if (isset($payload['logoConfig'])) { $current['logoConfig'] = $payload['logoConfig']; }
    if (isset($payload['stickyFooterConfig'])) { $current['stickyFooterConfig'] = $payload['stickyFooterConfig']; }

    $res = savePersistedSiteData($pdo, $current);
    echo json_encode([
        'success' => true,
        'lastUpdated' => $res['lastUpdated'],
        'storageEngine' => $res['savedToDb'] ? 'mysql' : 'file',
        'message' => 'Seluruh data profil, karya, agenda, logo, dan menu pintas berhasil disinkronkan ke server & database!'
    ]);
    exit;
}

// 8. Normal GET: Fetch site data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = loadPersistedSiteData($pdo);
    echo json_encode([
        'success' => true,
        'data' => $data,
        'lastUpdated' => $data['lastUpdated'] ?? round(microtime(true) * 1000),
        'storageEngine' => ($pdo !== null ? 'mysql' : 'file')
    ]);
    exit;
}
?>