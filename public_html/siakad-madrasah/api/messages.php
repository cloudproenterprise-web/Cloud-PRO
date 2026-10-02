<?php
require_once __DIR__ . '/../db_config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$pdo = getDbConnection();
$messagesFile = __DIR__ . '/../data/messages.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT msg_id as id, sender, institution, email, phone, event_type as eventType, event_date as date, message, is_read as `read`, created_at as createdAt FROM messages ORDER BY created_at DESC");
            $messages = $stmt->fetchAll();
            echo json_encode(['success' => true, 'messages' => $messages, 'storageEngine' => 'mysql']);
            exit;
        } catch (Exception $e) {}
    }
    
    // File fallback
    $list = [];
    if (file_exists($messagesFile)) {
        $raw = @file_get_contents($messagesFile);
        if ($raw) {
            $list = json_decode($raw, true) ?? [];
        }
    }
    echo json_encode(['success' => true, 'messages' => $list, 'storageEngine' => 'file']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!$data || empty($data['sender'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data tidak lengkap (nama pengirim wajib diisi)']);
        exit;
    }

    $msgId = 'msg-' . time() . '-' . rand(100, 999);
    $msgItem = [
        'id' => $msgId,
        'sender' => $data['sender'] ?? '',
        'institution' => $data['institution'] ?? '',
        'email' => $data['email'] ?? '',
        'phone' => $data['phone'] ?? '',
        'eventType' => $data['eventType'] ?? 'Silaturahmi',
        'date' => $data['date'] ?? date('d F Y'),
        'message' => $data['message'] ?? '',
        'read' => false,
        'createdAt' => date('c')
    ];

    $savedToDb = false;
    if ($pdo) {
        try {
            if (function_exists('ensureDatabaseTablesExist')) {
                ensureDatabaseTablesExist($pdo);
            }
            $stmt = $pdo->prepare("INSERT INTO messages (msg_id, sender, institution, email, phone, event_type, event_date, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $msgId,
                $msgItem['sender'],
                $msgItem['institution'],
                $msgItem['email'],
                $msgItem['phone'],
                $msgItem['eventType'],
                $msgItem['date'],
                $msgItem['message']
            ]);
            $savedToDb = true;
        } catch (Exception $e) {}
    }

    // Always save to JSON file as reliable backup
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $current = [];
    if (file_exists($messagesFile)) {
        $current = json_decode(@file_get_contents($messagesFile), true) ?? [];
    }
    array_unshift($current, $msgItem);
    @file_put_contents($messagesFile, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

    echo json_encode([
        'success' => true,
        'message' => 'Pesan silaturahmi berhasil tersimpan ke sistem!',
        'storageEngine' => $savedToDb ? 'mysql' : 'file'
    ]);
    exit;
}
?>