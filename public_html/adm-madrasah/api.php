<?php
/**
 * API Bridge MySQL untuk Si@Kad Madrasah
 * Menghubungkan Aplikasi Web dengan Database MySQL / MariaDB di Hosting (Plesk / cPanel / DirectAdmin)
 */

if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) {
    @ob_start('ob_gzhandler');
} else {
    ob_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Muat Konfigurasi Database (Prioritaskan db_config.local.php agar kebal terhadap timpa ZIP)
if (file_exists(__DIR__ . '/db_config.local.php')) {
    include_once __DIR__ . '/db_config.local.php';
}
if (file_exists(__DIR__ . '/db_config.php')) {
    include_once __DIR__ . '/db_config.php';
}
if (!defined('DB_HOST') && file_exists(__DIR__ . '/uploads/.db_config_backup.php')) {
    include_once __DIR__ . '/uploads/.db_config_backup.php';
}

$db_host = trim(defined('DB_HOST') ? DB_HOST : 'localhost');
$db_name = trim(defined('DB_NAME') ? DB_NAME : 'jaenal_siakadmadrasah');
$db_user = trim(defined('DB_USER') ? DB_USER : 'jaenal_siakadmadrah');
$db_pass = trim(defined('DB_PASS') ? DB_PASS : 'masbagus15');

// Otomatis amankan konfigurasi aktif ke db_config.local.php dan uploads/.db_config_backup.php jika belum ada
// agar ketika file ZIP baru ditimpa di Plesk / cPanel, koneksi database tidak tereset!
try {
    if (!file_exists(__DIR__ . '/db_config.local.php') && defined('DB_HOST')) {
        $secConfigContent = "<?php\n" .
            "// Konfigurasi Database Lokal - DILINDUNGI DARI TIMPA ZIP (cPanel & Plesk)\n" .
            "define('DB_HOST', " . var_export($db_host, true) . ");\n" .
            "define('DB_NAME', " . var_export($db_name, true) . ");\n" .
            "define('DB_USER', " . var_export($db_user, true) . ");\n" .
            "define('DB_PASS', " . var_export($db_pass, true) . ");\n";
        @file_put_contents(__DIR__ . '/db_config.local.php', $secConfigContent);
    }
    if (!file_exists(__DIR__ . '/uploads/.db_config_backup.php') && defined('DB_HOST')) {
        if (!file_exists(__DIR__ . '/uploads')) {
            @mkdir(__DIR__ . '/uploads', 0777, true);
        }
        $secConfigContent = "<?php\n" .
            "// Cadangan Konfigurasi Database - DILINDUNGI DARI TIMPA ZIP\n" .
            "if (!defined('DB_HOST')) define('DB_HOST', " . var_export($db_host, true) . ");\n" .
            "if (!defined('DB_NAME')) define('DB_NAME', " . var_export($db_name, true) . ");\n" .
            "if (!defined('DB_USER')) define('DB_USER', " . var_export($db_user, true) . ");\n" .
            "if (!defined('DB_PASS')) define('DB_PASS', " . var_export($db_pass, true) . ");\n";
        @file_put_contents(__DIR__ . '/uploads/.db_config_backup.php', $secConfigContent);
    }
} catch (Throwable $e) {}

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'error' => 'Koneksi Database MySQL Gagal: ' . $e->getMessage(),
        'hint' => 'Pastikan DB_NAME, DB_USER, dan DB_PASS pada file db_config.php di hosting sudah sesuai. Pastikan juga User Database telah diberi Hak Akses (User Permissions / All Privileges) ke Database di cPanel.'
    ]);
    exit();
}

// Buat tabel site_settings & pendaftaran_spmb secara otomatis jika belum ada
$pdo->exec("CREATE TABLE IF NOT EXISTS `site_settings` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS `pendaftaran_spmb` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Auto-seed default settings into MySQL database if table is empty
try {
    $countStmt = $pdo->query("SELECT COUNT(*) FROM `site_settings`");
    if ($countStmt && (int)$countStmt->fetchColumn() === 0) {
        $defaultData = [
            'general' => [
                'school_name' => 'Si@Kad',
                'tagline' => 'Sistem Informasi Akademik Modern',
                'address' => '',
                'phone' => '',
                'email' => '',
                'operational_hours' => 'Senin - Sabtu: 07:00 - 14:00 WIB',
                'headmaster_name' => '',
                'headmaster_title' => 'Kepala Madrasah',
                'maps_latitude' => '-7.517606',
                'maps_longitude' => '109.132984',
                'maps_zoom' => '16'
            ],
            'hero' => [
                'badge_text' => 'Eksklusif & Modern',
                'heading_line1' => 'Si@Kad',
                'heading_line2' => 'Madrasah',
                'description' => 'Selamat datang di institusi pendidikan yang memadukan kemuliaan akhlakul karimah dengan keunggulan akademik berbasis digital.',
                'cta_primary' => 'Daftar Sekarang',
                'cta_secondary' => 'Lihat Profil',
                'stats_students' => '150+',
                'stats_achievements' => '25+',
                'stats_teachers' => '15+',
                'stats_years' => '10+',
                'background_image' => '/og-cover.jpg',
                'right_image' => '/og-cover.jpg',
                'images' => [
                    ['url' => '/og-cover.jpg', 'title' => 'Pembiasaan', 'subtitle' => 'Terakreditasi & Berprestasi']
                ],
                'right_image_title' => 'Pembiasaan',
                'right_image_subtitle' => 'Terakreditasi & Berprestasi'
            ],
            'running_text' => [
                'enabled' => true,
                'text' => 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
                'direction' => 'right_to_left',
                'speed' => 'normal',
                'badge' => 'INFORMASI MADRASAH',
                'bg_color' => 'emerald',
                'link_url' => '/spmb',
                'link_label' => 'Lihat SPMB',
                'show_close_button' => true,
                'archive' => [
                    [
                        'id' => '1',
                        'text' => 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
                        'badge' => 'INFORMASI MADRASAH',
                        'direction' => 'right_to_left',
                        'speed' => 'normal',
                        'bg_color' => 'emerald',
                        'link_url' => '/spmb',
                        'link_label' => 'Lihat SPMB',
                        'created_at' => date('Y-m-d H:i:s'),
                        'is_active' => true
                    ]
                ]
            ],
            'seo' => [
                'title' => 'Si@Kad - Sistem Informasi Akademik Modern',
                'description' => 'Aplikasi Sistem Informasi Akademik Madrasah Modern untuk kelola data siswa, guru, jadwal KBM, nilai, dan SPMB secara digital.',
                'image_url' => '/og-cover.jpg',
                'og_image_url' => '/og-cover.jpg'
            ],
            'tahun_pelajaran' => [
                'active_year' => '2026/2027',
                'available_years' => ['2026/2027', '2025/2026', '2024/2025', '2023/2024'],
                'spmb_year' => '2026/2027',
                'semester' => 'Ganjil'
            ],
            'sticky_footer' => [
                'items' => [
                    ['icon_name' => 'Home', 'label' => 'Beranda', 'path' => '/'],
                    ['icon_name' => 'Brain', 'label' => 'Modul Ajar KBC', 'path' => '/ai-teaching'],
                    ['icon_name' => 'Link', 'label' => 'Tautan', 'path' => '/links'],
                    ['icon_name' => 'Users', 'label' => 'SPMB', 'path' => '/spmb'],
                    ['icon_name' => 'UserCircle', 'label' => 'Admin', 'path' => '/login']
                ]
            ],
            'teachers' => [
                [
                    'id' => 'g-1',
                    'nama' => 'Ahmad Syafii',
                    'gelar' => 'S.Pd.I, M.Pd',
                    'nik' => '3302151501850001',
                    'nip' => '198501152010011001',
                    'nuptk' => '1234567890123456',
                    'npk' => '987654321012',
                    'peg_id' => '20198501150001',
                    'nrg' => '120984756',
                    'jabatan' => 'Kepala Madrasah & Guru PAI',
                    'status_kepegawaian' => 'PNS',
                    'gender' => 'Laki-laki',
                    'telepon' => '081234567890',
                    'email' => 'ahmad.syafii@mimaarif.sch.id',
                    'pendidikan' => 'S2 Pendidikan Agama Islam',
                    'sertifikasi' => 'Sudah Sertifikasi',
                    'no_sertifikat_pendidik' => '123456789012',
                    'mapel_diampu' => 'Akidah Akhlak',
                    'mengajar_kelas' => 'Kelas 4, 5, 6',
                    'tempat_lahir' => 'Banyumas',
                    'tanggal_lahir' => '1985-01-15',
                    'foto_url' => '',
                    'status_keaktifan' => 'Aktif',
                    'tmt_pendidik' => '2010-01-01',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'g-2',
                    'nama' => 'Siti Nurjanah',
                    'gelar' => 'S.Pd',
                    'nik' => '3302156003900002',
                    'nip' => '199003202015022002',
                    'nuptk' => '8765432109876543',
                    'npk' => '876543210987',
                    'peg_id' => '20199003200002',
                    'nrg' => '120984757',
                    'jabatan' => 'Guru Kelas I',
                    'status_kepegawaian' => 'PPPK',
                    'gender' => 'Perempuan',
                    'telepon' => '082198765432',
                    'email' => 'siti.nurjanah@mimaarif.sch.id',
                    'pendidikan' => 'S1 PGMI / PGSD',
                    'sertifikasi' => 'Sudah Sertifikasi',
                    'no_sertifikat_pendidik' => '987654321098',
                    'mapel_diampu' => 'Guru Kelas / Tematik',
                    'mengajar_kelas' => 'Kelas 1',
                    'tempat_lahir' => 'Banyumas',
                    'tanggal_lahir' => '1990-03-20',
                    'foto_url' => '',
                    'status_keaktifan' => 'Aktif',
                    'tmt_pendidik' => '2015-02-01',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'g-3',
                    'nama' => 'M. Ridwan Kurniawan',
                    'gelar' => 'S.Pd',
                    'nik' => '3302151207930003',
                    'nip' => '199307122019031003',
                    'nuptk' => '5678901234567890',
                    'npk' => '765432109876',
                    'peg_id' => '20199307120003',
                    'nrg' => '',
                    'jabatan' => 'Guru Mapel Bahasa Arab',
                    'status_kepegawaian' => 'GTY / Guru Tetap Yayasan',
                    'gender' => 'Laki-laki',
                    'telepon' => '085712345678',
                    'email' => 'ridwan.kurniawan@mimaarif.sch.id',
                    'pendidikan' => 'S1 Pendidikan Bahasa Arab',
                    'sertifikasi' => 'Dalam Proses',
                    'no_sertifikat_pendidik' => '',
                    'mapel_diampu' => 'Bahasa Arab & Al-Qur\'an Hadis',
                    'mengajar_kelas' => 'Kelas 1, 2, 3, 4, 5, 6',
                    'tempat_lahir' => 'Purwokerto',
                    'tanggal_lahir' => '1993-07-12',
                    'foto_url' => '',
                    'status_keaktifan' => 'Aktif',
                    'tmt_pendidik' => '2019-03-01',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'g-4',
                    'nama' => 'Dewi Rahmawati',
                    'gelar' => 'S.Kom',
                    'nik' => '3302154508950004',
                    'nip' => '-',
                    'nuptk' => '3456789012345678',
                    'npk' => '654321098765',
                    'peg_id' => '20199508050004',
                    'nrg' => '',
                    'jabatan' => 'Guru TIK & Operator EMIS',
                    'status_kepegawaian' => 'GTT / Honorer',
                    'gender' => 'Perempuan',
                    'telepon' => '088812349999',
                    'email' => 'dewi.rahmawati@mimaarif.sch.id',
                    'pendidikan' => 'S1 Teknik Informatika',
                    'sertifikasi' => 'Belum Sertifikasi',
                    'no_sertifikat_pendidik' => '',
                    'mapel_diampu' => 'Informatika / TIK',
                    'mengajar_kelas' => 'Kelas 4, 5, 6',
                    'tempat_lahir' => 'Cilacap',
                    'tanggal_lahir' => '1995-08-05',
                    'foto_url' => '',
                    'status_keaktifan' => 'Aktif',
                    'tmt_pendidik' => '2021-07-15',
                    'created_at' => date('Y-m-d H:i:s')
                ],
                [
                    'id' => 'g-5',
                    'nama' => 'Bambang Subagyo',
                    'gelar' => 'S.Pd',
                    'nik' => '3302150211880005',
                    'nip' => '198811022014011005',
                    'nuptk' => '7654321098765432',
                    'npk' => '543210987654',
                    'peg_id' => '20198811020005',
                    'nrg' => '120984758',
                    'jabatan' => 'Guru PJOK & Pembina Pramuka',
                    'status_kepegawaian' => 'PNS',
                    'gender' => 'Laki-laki',
                    'telepon' => '081398761234',
                    'email' => 'bambang.subagyo@mimaarif.sch.id',
                    'pendidikan' => 'S1 Pendidikan Jasmani (PJOK)',
                    'sertifikasi' => 'Sudah Sertifikasi',
                    'no_sertifikat_pendidik' => '543210987654',
                    'mapel_diampu' => 'Pendidikan Jasmani & Olahraga',
                    'mengajar_kelas' => 'Kelas 1, 2, 3, 4, 5, 6',
                    'tempat_lahir' => 'Banyumas',
                    'tanggal_lahir' => '1988-11-02',
                    'foto_url' => '',
                    'status_keaktifan' => 'Aktif',
                    'tmt_pendidik' => '2014-01-01',
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ]
        ];

        $seedStmt = $pdo->prepare("INSERT INTO `site_settings` (`id`, `value`) VALUES (?, ?)");
        foreach ($defaultData as $key => $val) {
            $seedStmt->execute([$key, json_encode($val, JSON_UNESCAPED_UNICODE)]);
        }
    }
} catch (Exception $e) {
    // Abaikan jika pemanggilan auto-seed terhambat
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'test_connection') {
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);
    
    $test_host = trim(!empty($payload['host']) ? $payload['host'] : $db_host);
    $test_port = trim(!empty($payload['port']) ? $payload['port'] : '3306');
    $test_name = trim(!empty($payload['database']) ? $payload['database'] : $db_name);
    $test_user = trim(!empty($payload['username']) ? $payload['username'] : $db_user);
    $test_pass = trim(isset($payload['password']) ? $payload['password'] : $db_pass);

    try {
        $testPdo = new PDO("mysql:host=$test_host;port=$test_port;dbname=$test_name;charset=utf8mb4", $test_user, $test_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        echo json_encode([
            'status' => 'success',
            'connected' => true,
            'message' => "Terhubung ke database MySQL Plesk ($test_name@$test_host:$test_port)!",
            'server_info' => $testPdo->getAttribute(PDO::ATTR_SERVER_INFO)
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'status' => 'error',
            'connected' => false,
            'message' => "Gagal terhubung ke MySQL Hosting: " . $e->getMessage()
        ]);
    }
    exit();
}

if ($action === 'select') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT id, value, updated_at FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $row['value'] = json_decode($row['value'], true);
            echo json_encode(['data' => $row, 'error' => null]);
        } else {
            echo json_encode(['data' => null, 'error' => null]);
        }
    } else {
        $stmt = $pdo->prepare("SELECT id, value, updated_at FROM `$table`");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['value'] = json_decode($r['value'], true);
        }
        echo json_encode(['data' => $rows, 'error' => null]);
    }
    exit();
}

if ($action === 'upsert') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);

    if (!$payload) {
        echo json_encode(['error' => 'Payload JSON tidak valid']);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO `$table` (id, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()");

    // Jika payload berupa array/list dari objek [{id, value}, ...]
    if (isset($payload[0]) && is_array($payload[0])) {
        $pdo->beginTransaction();
        try {
            foreach ($payload as $item) {
                $itemId = isset($item['id']) ? $item['id'] : null;
                $itemVal = isset($item['value']) ? json_encode($item['value'], JSON_UNESCAPED_UNICODE) : '{}';
                if ($itemId) {
                    $stmt->execute([$itemId, $itemVal]);
                }
            }
            $pdo->commit();
            echo json_encode(['data' => true, 'error' => null]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Gagal simpan batch ke MySQL: ' . $e->getMessage()]);
        }
        exit();
    }

    // Jika payload berupa tunggal {id, value}
    $id = isset($payload['id']) ? $payload['id'] : null;
    $val = isset($payload['value']) ? json_encode($payload['value'], JSON_UNESCAPED_UNICODE) : '{}';

    if (!$id) {
        echo json_encode(['error' => 'ID data wajib diisi']);
        exit();
    }

    $stmt->execute([$id, $val]);

    echo json_encode(['data' => ['id' => $id], 'error' => null]);
    exit();
}

if ($action === 'delete') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
    }
    echo json_encode(['data' => true, 'error' => null]);
    exit();
}

if ($action === 'upload') {
    $uploadDir = __DIR__ . '/uploads/';
    if (!file_exists($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }
    if (file_exists($uploadDir)) {
        @chmod($uploadDir, 0777);
    }

    $fileUploaded = false;
    $fileName = '';
    $uploadedFileKey = null;

    if (!empty($_FILES)) {
        foreach ($_FILES as $key => $fileObj) {
            if (isset($fileObj['tmp_name']) && !empty($fileObj['tmp_name']) && $fileObj['error'] === UPLOAD_ERR_OK) {
                $uploadedFileKey = $key;
                break;
            }
        }
    }

    if ($uploadedFileKey !== null && isset($_FILES[$uploadedFileKey])) {
        $fileObj = $_FILES[$uploadedFileKey];
        $rawName = basename($fileObj['name']);
        $cleanName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $rawName);
        $fileName = time() . '_' . rand(100, 999) . '_' . $cleanName;
        $targetFile = $uploadDir . $fileName;

        if (@move_uploaded_file($fileObj['tmp_name'], $targetFile)) {
            $fileUploaded = true;
        }
    }

    // Secondary fallback: Base64 JSON payload
    if (!$fileUploaded) {
        $raw_input = file_get_contents('php://input');
        if ($raw_input) {
            $payload = json_decode($raw_input, true);
            $base64Data = null;
            if (isset($payload['base64'])) {
                $base64Data = $payload['base64'];
            } elseif (isset($payload['image'])) {
                $base64Data = $payload['image'];
            } elseif (isset($payload['file']) && is_string($payload['file']) && strpos($payload['file'], 'data:') === 0) {
                $base64Data = $payload['file'];
            }

            if ($base64Data && preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $dataStr = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
                if ($ext === 'jpeg') $ext = 'jpg';
                $decoded = base64_decode($dataStr);
                if ($decoded !== false) {
                    $fileName = time() . '_' . rand(1000, 9999) . '.' . $ext;
                    $targetFile = $uploadDir . $fileName;
                    if (@file_put_contents($targetFile, $decoded) !== false) {
                        $fileUploaded = true;
                    }
                }
            }
        }
    }

    if ($fileUploaded && !empty($fileName)) {
        @chmod($uploadDir . $fileName, 0644);
        $isHttps = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === '1')) || 
                   (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
                   (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
                   (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == '443');
        $protocol = $isHttps ? 'https' : 'http';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
        $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
        $dirPath = ($dir === '' || $dir === '.' || $dir === '/') ? '' : $dir;
        $relativePath = $dirPath . '/uploads/' . $fileName;
        $fileUrl = $protocol . '://' . $host . $relativePath;

        echo json_encode([
            'status' => 'success',
            'publicUrl' => !empty($host) ? $fileUrl : $relativePath,
            'fullUrl' => $fileUrl,
            'relativePath' => $relativePath,
            'path' => 'uploads/' . $fileName,
            'fileName' => $fileName,
            'error' => null
        ]);
        exit();
    }

    $fileErrNotice = '';
    if (!empty($_FILES)) {
        foreach ($_FILES as $k => $f) {
            if (isset($f['error']) && $f['error'] !== UPLOAD_ERR_OK) {
                $fileErrNotice .= ' Error ' . $k . ': ' . $f['error'];
            }
        }
    }

    echo json_encode([
        'status' => 'error',
        'error' => 'Gagal mengunggah berkas gambar.' . $fileErrNotice,
        'hint' => 'Pastikan folder "uploads" di direktori web hosting memiliki hak akses/permission 0755 atau 0777.'
    ]);
    exit();
}

// -------------------------------------------------------------------------
// 1. BACKUP LENGKAP: DATABASE + GAMBAR & DOKUMEN (ZIP)
// -------------------------------------------------------------------------
if ($action === 'backup_full' || $action === 'export_zip') {
    while (ob_get_level()) {
        ob_end_clean();
    }

    // Ambil seluruh data dari site_settings
    $stmt = $pdo->query("SELECT id, value, updated_at FROM `site_settings`");
    $rawSettings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $settings = [];
    foreach ($rawSettings as $row) {
        $decoded = json_decode($row['value'], true);
        $settings[] = [
            'id' => $row['id'],
            'value' => $decoded !== null ? $decoded : $row['value'],
            'updated_at' => $row['updated_at']
        ];
    }

    // Ambil data pendaftaran_spmb jika tabel tersedia
    $spmb = [];
    try {
        $sStmt = $pdo->query("SELECT * FROM `pendaftaran_spmb`");
        if ($sStmt) {
            $spmb = $sStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Throwable $e) {}

    // Ambil data teachers jika tabel tersedia
    $teachers = [];
    try {
        $tStmt = $pdo->query("SELECT * FROM `teachers`");
        if ($tStmt) {
            $teachers = $tStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Throwable $e) {}

    // Ambil data users jika tabel tersedia
    $users = [];
    try {
        $uStmt = $pdo->query("SELECT id, username, email, role, created_at FROM `users`");
        if ($uStmt) {
            $users = $uStmt->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Throwable $e) {}

    $schoolName = 'SIAKAD Madrasah';
    foreach ($settings as $s) {
        if ($s['id'] === 'general' && is_array($s['value']) && !empty($s['value']['school_name'])) {
            $schoolName = $s['value']['school_name'];
            break;
        }
    }

    $databaseData = [
        'version' => '2.0',
        'app' => 'SIAKAD MIMA 2 Sanggreman',
        'timestamp' => date('c'),
        'school_name' => $schoolName,
        'tables' => [
            'site_settings' => $settings,
            'pendaftaran_spmb' => $spmb,
            'teachers' => $teachers,
            'users' => $users
        ]
    ];

    // Pindai seluruh berkas di direktori uploads/ (gambar, dokumen, pdf, dll)
    $uploadDir = __DIR__ . '/uploads/';
    $uploadFiles = [];
    if (file_exists($uploadDir) && is_dir($uploadDir)) {
        $dirItems = scandir($uploadDir);
        foreach ($dirItems as $item) {
            if ($item === '.' || $item === '..' || $item === '.htaccess' || $item === 'index.html' || strpos($item, '.') === 0) {
                continue;
            }
            $itemPath = $uploadDir . $item;
            if (is_file($itemPath)) {
                $uploadFiles[] = [
                    'name' => $item,
                    'path' => $itemPath,
                    'size' => filesize($itemPath),
                    'mime' => @mime_content_type($itemPath) ?: 'application/octet-stream'
                ];
            }
        }
    }

    // Buat SQL Dump untuk impor darurat phpMyAdmin
    $sqlDump = "-- ========================================================\n";
    $sqlDump .= "-- CADANGAN DATABASE SIAKAD MADRASAH (FULL SQL DUMP)\n";
    $sqlDump .= "-- Madrasah: " . $schoolName . "\n";
    $sqlDump .= "-- Tanggal : " . date('Y-m-d H:i:s') . "\n";
    $sqlDump .= "-- ========================================================\n\n";
    $sqlDump .= "SET FOREIGN_KEY_CHECKS = 0;\n";
    $sqlDump .= "CREATE TABLE IF NOT EXISTS `site_settings` (\n";
    $sqlDump .= "  `id` VARCHAR(191) NOT NULL PRIMARY KEY,\n";
    $sqlDump .= "  `value` LONGTEXT NOT NULL,\n";
    $sqlDump .= "  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n";
    $sqlDump .= ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n";
    foreach ($rawSettings as $row) {
        $sqlDump .= "INSERT INTO `site_settings` (`id`, `value`) VALUES (" . $pdo->quote($row['id']) . ", " . $pdo->quote($row['value']) . ") ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);\n";
    }
    $sqlDump .= "\nSET FOREIGN_KEY_CHECKS = 1;\n";

    $manifest = [
        'app' => 'SIAKAD Madrasah',
        'backup_type' => 'full_archive',
        'version' => '2.0',
        'created_at' => date('Y-m-d H:i:s'),
        'school_name' => $schoolName,
        'stats' => [
            'site_settings_count' => count($settings),
            'spmb_count' => count($spmb),
            'teachers_count' => count($teachers),
            'uploads_count' => count($uploadFiles)
        ],
        'files' => array_map(function($f) { return $f['name']; }, $uploadFiles)
    ];

    $safeSchool = preg_replace('/[^a-zA-Z0-9_-]/', '_', $schoolName);
    $zipFilename = 'backup-siakad-lengkap-' . strtolower($safeSchool) . '-' . date('Y-m-d_His') . '.zip';

    if (class_exists('ZipArchive')) {
        $tempZip = tempnam(sys_get_temp_dir(), 'siakad_bak_');
        $zip = new ZipArchive();
        if ($zip->open($tempZip, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $zip->addFromString('database.json', json_encode($databaseData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $zip->addFromString('database.sql', $sqlDump);
            
            // Masukkan seluruh berkas uploads/
            foreach ($uploadFiles as $uf) {
                $zip->addFile($uf['path'], 'uploads/' . $uf['name']);
            }
            $zip->close();

            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
            header('Content-Length: ' . filesize($tempZip));
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            readfile($tempZip);
            @unlink($tempZip);
            exit();
        }
    }

    // Fallback jika ZipArchive belum diaktifkan di PHP server hosting
    header('Content-Type: application/json; charset=utf-8');
    $embeddedFiles = [];
    foreach ($uploadFiles as $uf) {
        if ($uf['size'] < 10 * 1024 * 1024) {
            $embeddedFiles[] = [
                'name' => $uf['name'],
                'data' => base64_encode(file_get_contents($uf['path'])),
                'mime' => $uf['mime']
            ];
        }
    }
    echo json_encode([
        'status' => 'success',
        'fallback_json' => true,
        'manifest' => $manifest,
        'database' => $databaseData,
        'uploads' => $embeddedFiles
    ]);
    exit();
}

// -------------------------------------------------------------------------
// 2. RESTORE LENGKAP: DATABASE + GAMBAR & DOKUMEN (DARI ZIP MAUPUN JSON)
// -------------------------------------------------------------------------
if ($action === 'restore_full') {
    $uploadedZipPath = null;
    $isJson = false;
    $jsonContent = null;

    if (!empty($_FILES)) {
        foreach ($_FILES as $f) {
            if (isset($f['tmp_name']) && !empty($f['tmp_name']) && $f['error'] === UPLOAD_ERR_OK) {
                $origName = strtolower($f['name']);
                if (str_ends_with($origName, '.zip')) {
                    $uploadedZipPath = $f['tmp_name'];
                } elseif (str_ends_with($origName, '.json')) {
                    $isJson = true;
                    $jsonContent = file_get_contents($f['tmp_name']);
                }
                break;
            }
        }
    }

    if (!$uploadedZipPath && !$isJson) {
        $raw = file_get_contents('php://input');
        if ($raw) {
            $decoded = json_decode($raw, true);
            if ($decoded && (isset($decoded['tables']) || isset($decoded['database']))) {
                $isJson = true;
                $jsonContent = $raw;
            }
        }
    }

    $restoredFiles = 0;
    $restoredSettings = 0;
    $restoredSpmb = 0;
    $uploadDir = __DIR__ . '/uploads/';
    if (!file_exists($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }

    if ($uploadedZipPath && class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($uploadedZipPath) === true) {
            // 1. Ekstrak & Restore database.json (cek di root maupun subdirektori)
            $dbJson = $zip->getFromName('database.json');
            if ($dbJson === false) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $name = $zip->getNameIndex($i);
                    if (basename($name) === 'database.json' || (preg_match('/\.json$/i', $name) && !preg_match('/(manifest|package|composer)/i', $name))) {
                        $dbJson = $zip->getFromIndex($i);
                        break;
                    }
                }
            }

            if ($dbJson) {
                $jsonObj = json_decode($dbJson, true);
                if ($jsonObj) {
                    $tables = isset($jsonObj['tables']) ? $jsonObj['tables'] : (isset($jsonObj['database']['tables']) ? $jsonObj['database']['tables'] : []);
                    $rawSettings = !empty($tables['site_settings']) ? $tables['site_settings'] : (!empty($jsonObj['site_settings']) ? $jsonObj['site_settings'] : []);
                    
                    // Normalisasi apakah array list atau associative object
                    $settingsList = [];
                    if (is_array($rawSettings)) {
                        $isAssoc = array_keys($rawSettings) !== range(0, count($rawSettings) - 1);
                        if ($isAssoc) {
                            foreach ($rawSettings as $k => $v) {
                                $settingsList[] = ['id' => $k, 'value' => $v];
                            }
                        } else {
                            $settingsList = $rawSettings;
                        }
                    }

                    if (!empty($settingsList)) {
                        $stmtUpsert = $pdo->prepare("INSERT INTO `site_settings` (`id`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `updated_at`=NOW()");
                        foreach ($settingsList as $row) {
                            $rowId = is_array($row) ? (isset($row['id']) ? $row['id'] : null) : null;
                            $rowVal = is_array($row) ? (isset($row['value']) ? (is_string($row['value']) ? $row['value'] : json_encode($row['value'], JSON_UNESCAPED_UNICODE)) : null) : null;
                            if ($rowId) {
                                $stmtUpsert->execute([$rowId, $rowVal]);
                                $restoredSettings++;
                            }
                        }
                    }

                    $rawSpmb = !empty($tables['pendaftaran_spmb']) ? $tables['pendaftaran_spmb'] : (!empty($jsonObj['pendaftaran_spmb']) ? $jsonObj['pendaftaran_spmb'] : []);
                    if (!empty($rawSpmb) && is_array($rawSpmb)) {
                        try {
                            $pdo->exec("CREATE TABLE IF NOT EXISTS `pendaftaran_spmb` (
                                `id` VARCHAR(191) NOT NULL PRIMARY KEY,
                                `data` LONGTEXT NULL,
                                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                            
                            $stmtSpmb = $pdo->prepare("INSERT INTO `pendaftaran_spmb` (`id`, `data`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `data`=VALUES(`data`)");
                            foreach ($rawSpmb as $sp) {
                                if (isset($sp['id'])) {
                                    $stmtSpmb->execute([$sp['id'], json_encode($sp, JSON_UNESCAPED_UNICODE)]);
                                    $restoredSpmb++;
                                }
                            }
                        } catch (Throwable $e) {}
                    }
                }
            }

            // 2. Ekstrak seluruh berkas gambar dan dokumen dari uploads/*
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $entryName = $zip->getNameIndex($i);
                if (str_starts_with($entryName, 'uploads/')) {
                    $subName = substr($entryName, strlen('uploads/'));
                    if (empty($subName) || str_ends_with($subName, '/')) continue;
                    
                    $cleanName = basename($subName);
                    // Filter keamanan ketat: cegah berkas executable
                    if (preg_match('/\.(php|phtml|sh|pl|py|cgi|asp|exe)$/i', $cleanName)) continue;
                    if ($cleanName === '.htaccess') continue;
                    
                    $content = $zip->getFromIndex($i);
                    if ($content !== false) {
                        @file_put_contents($uploadDir . $cleanName, $content);
                        @chmod($uploadDir . $cleanName, 0644);
                        $restoredFiles++;
                    }
                }
            }
            $zip->close();

            echo json_encode([
                'status' => 'success',
                'message' => "Restorasi arsip ZIP berhasil! Dipulihkan: $restoredSettings data modul/pengaturan dan $restoredFiles berkas gambar & dokumen.",
                'restored_settings' => $restoredSettings,
                'restored_files' => $restoredFiles,
                'restored_spmb' => $restoredSpmb
            ]);
            exit();
        } else {
            echo json_encode(['status' => 'error', 'error' => 'Gagal membuka file ZIP arsip backup.']);
            exit();
        }
    }

    if ($isJson && $jsonContent) {
        $jsonObj = json_decode($jsonContent, true);
        if (!$jsonObj) {
            echo json_encode(['status' => 'error', 'error' => 'Format JSON tidak valid.']);
            exit();
        }
        $tables = isset($jsonObj['tables']) ? $jsonObj['tables'] : (isset($jsonObj['database']['tables']) ? $jsonObj['database']['tables'] : []);
        if (!empty($tables['site_settings']) && is_array($tables['site_settings'])) {
            $stmtUpsert = $pdo->prepare("INSERT INTO `site_settings` (`id`, `value`, `updated_at`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `updated_at`=NOW()");
            foreach ($tables['site_settings'] as $row) {
                $rowId = is_array($row) ? $row['id'] : null;
                $rowVal = is_array($row) ? (is_string($row['value']) ? $row['value'] : json_encode($row['value'], JSON_UNESCAPED_UNICODE)) : null;
                if ($rowId) {
                    $stmtUpsert->execute([$rowId, $rowVal]);
                    $restoredSettings++;
                }
            }
        }
        if (!empty($jsonObj['uploads']) && is_array($jsonObj['uploads'])) {
            foreach ($jsonObj['uploads'] as $u) {
                if (!empty($u['name']) && !empty($u['data'])) {
                    $clean = basename($u['name']);
                    if (!preg_match('/\.(php|phtml|sh|pl|py|cgi|asp|exe)$/i', $clean) && $clean !== '.htaccess') {
                        $bin = base64_decode($u['data']);
                        if ($bin !== false) {
                            @file_put_contents($uploadDir . $clean, $bin);
                            @chmod($uploadDir . $clean, 0644);
                            $restoredFiles++;
                        }
                    }
                }
            }
        }

        echo json_encode([
            'status' => 'success',
            'message' => "Restorasi JSON berhasil! Dipulihkan: $restoredSettings modul data dan $restoredFiles berkas lampiran.",
            'restored_settings' => $restoredSettings,
            'restored_files' => $restoredFiles
        ]);
        exit();
    }

    echo json_encode(['status' => 'error', 'error' => 'Berkas backup (.zip atau .json) tidak ditemukan.']);
    exit();
}

// -------------------------------------------------------------------------
// 3. DAFTAR BERKAS UPLOADS (GAMBAR & DOKUMEN)
// -------------------------------------------------------------------------
if ($action === 'list_uploads') {
    $uploadDir = __DIR__ . '/uploads/';
    $files = [];
    $isHttps = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === '1')) || 
               (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $protocol = $isHttps ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $dirPath = ($dir === '' || $dir === '.' || $dir === '/') ? '' : $dir;

    $totalSize = 0;
    if (file_exists($uploadDir) && is_dir($uploadDir)) {
        $items = scandir($uploadDir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === '.htaccess' || $item === 'index.html' || strpos($item, '.') === 0) continue;
            $path = $uploadDir . $item;
            if (is_file($path)) {
                $fSize = filesize($path);
                $totalSize += $fSize;
                $files[] = [
                    'name' => $item,
                    'size' => $fSize,
                    'url' => $protocol . '://' . $host . $dirPath . '/uploads/' . $item,
                    'modified' => date('c', filemtime($path))
                ];
            }
        }
    }
    echo json_encode([
        'status' => 'success',
        'data' => $files,
        'total_files' => count($files),
        'total_size_bytes' => $totalSize,
        'total_size_mb' => round($totalSize / (1024 * 1024), 2)
    ]);
    exit();
}

// -------------------------------------------------------------------------
// 4. STATUS PERLINDUNGAN & KESEHATAN SISTEM HOSTING
// -------------------------------------------------------------------------
if ($action === 'backup_status') {
    $hasLocalConfig = file_exists(__DIR__ . '/db_config.local.php');
    $hasBackupConfig = file_exists(__DIR__ . '/uploads/.db_config_backup.php');
    $uploadDir = __DIR__ . '/uploads/';
    $fileCount = 0;
    $totalSize = 0;
    if (file_exists($uploadDir) && is_dir($uploadDir)) {
        foreach (scandir($uploadDir) as $item) {
            if ($item !== '.' && $item !== '..' && $item !== '.htaccess' && $item !== 'index.html' && strpos($item, '.') !== 0) {
                $p = $uploadDir . $item;
                if (is_file($p)) {
                    $fileCount++;
                    $totalSize += filesize($p);
                }
            }
        }
    }

    $settingCount = 0;
    try {
        $c = $pdo->query("SELECT COUNT(*) FROM `site_settings`");
        if ($c) $settingCount = (int)$c->fetchColumn();
    } catch (Throwable $e) {}

    echo json_encode([
        'status' => 'success',
        'safe_overwrite_protection' => true,
        'has_local_config' => $hasLocalConfig,
        'has_backup_config' => $hasBackupConfig,
        'upload_files_count' => $fileCount,
        'upload_files_size_mb' => round($totalSize / (1024 * 1024), 2),
        'settings_records_count' => $settingCount,
        'zip_support' => class_exists('ZipArchive'),
        'message' => 'Sistem cadangan dan proteksi timpa ZIP aktif!'
    ]);
    exit();
}

// -------------------------------------------------------------------------
// 5. PEMBARUAN & SINKRONISASI SISTEM (GIT PULL & VERSION)
// -------------------------------------------------------------------------
if ($action === 'system_version') {
    $currentGitCommit = 'unknown';
    $currentGitDate = '';
    $hasGit = false;

    if (function_exists('exec')) {
        $out = [];
        $ret = 0;
        @exec('git log -1 --format="%h - %s (%ci)" 2>&1', $out, $ret);
        if ($ret === 0 && !empty($out[0])) {
            $hasGit = true;
            $currentGitCommit = $out[0];
        }
    }

    echo json_encode([
        'status' => 'success',
        'has_git' => $hasGit,
        'current_commit' => $currentGitCommit,
        'php_version' => PHP_VERSION,
        'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'Unknown',
        'app_version' => '2.5.0-master'
    ]);
    exit();
}

if ($action === 'git_pull') {
    if (!function_exists('exec') && !function_exists('shell_exec')) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Fitur eksekusi baris perintah (shell/exec) tidak diizinkan oleh konfigurasi PHP hosting ini. Silakan gunakan metode 1-Click Update Otomatis dari GitHub atau unduh paket ZIP pembaruan.'
        ]);
        exit();
    }

    $targetDir = __DIR__;
    $cmdDir = $targetDir;
    if (file_exists($targetDir . '/../.git')) {
        $cmdDir = realpath($targetDir . '/..');
    }

    $output = [];
    $returnVar = 0;
    $cmd = 'cd ' . escapeshellarg($cmdDir) . ' && git pull origin main 2>&1';
    @exec($cmd, $output, $returnVar);
    $outStr = implode("\n", $output);

    if ($returnVar === 0) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Sinkronisasi Git Pull berhasil dilakukan!',
            'output' => $outStr ?: 'Sudah versi paling mutakhir (Already up to date).'
        ]);
    } else {
        echo json_encode([
            'status' => 'warning',
            'message' => 'Perintah Git Pull selesai dengan kode: ' . $returnVar . ' (' . ($outStr ?: 'Pastikan folder hosting terhubung sebagai Git repo atau gunakan tombol Perbarui Otomatis') . ')',
            'output' => $outStr ?: 'Tidak ada respon teks dari Git.'
        ]);
    }
    exit();
}

// -------------------------------------------------------------------------
// 6. 1-CLICK WEB UPDATER DARI GITHUB (AMAN TANPA TIMPA DATA/UPLOADS)
// -------------------------------------------------------------------------
if ($action === 'auto_update_web') {
    // Non-blocking timeout limit
    @set_time_limit(300);
    @ini_set('memory_limit', '256M');

    $targetDir = __DIR__;
    // Cek apakah target adalah root atau folder public
    if (file_exists($targetDir . '/../package.json')) {
        $rootDir = realpath($targetDir . '/..');
    } else {
        $rootDir = $targetDir;
    }

    $logs = [];
    $updatedCount = 0;
    $protectedSkipped = 0;

    // 1. Coba metode Git Pull terlebih dahulu jika repo terkonfigurasi
    $gitSuccess = false;
    if (function_exists('exec') && (is_dir($rootDir . '/.git') || is_dir($targetDir . '/.git'))) {
        $cmdDir = is_dir($rootDir . '/.git') ? $rootDir : $targetDir;
        $out = [];
        $ret = 0;
        @exec("cd " . escapeshellarg($cmdDir) . " && git pull origin main 2>&1", $out, $ret);
        if ($ret === 0) {
            $gitSuccess = true;
            $logs[] = "Git Pull Sukses: " . implode("\n", $out);
            echo json_encode([
                'status' => 'success',
                'method' => 'git_pull',
                'message' => 'Pembaruan via Git Pull berhasil! Berkas aplikasi kini telah mutakhir dari GitHub.',
                'output' => implode("\n", $out),
                'safe_protection' => 'Data database dan berkas folder uploads/ tetap terjaga utuh 100%.'
            ]);
            exit();
        } else {
            $logs[] = "Git Pull tidak dapat dieksekusi, beralih otomatis ke metode Download ZIP aman: " . implode("\n", $out);
        }
    }

    // 2. Metode Direct Download ZIP dari GitHub (Fallback universal untuk shared hosting cPanel/Plesk)
    if (!class_exists('ZipArchive')) {
        echo json_encode([
            'status' => 'error',
            'error' => 'Ekstensi PHP ZipArchive belum diaktifkan di server hosting Anda. Silakan aktifkan php-zip melalui cPanel (Select PHP Version / PHP Extensions) atau jalankan Git Pull.'
        ]);
        exit();
    }

    $zipUrl = 'https://codeload.github.com/siakadmadrasah-lang/Master-Siakad/zip/refs/heads/main';
    $tempZip = sys_get_temp_dir() . '/siakad_update_' . time() . '.zip';
    if (!is_writable(sys_get_temp_dir())) {
        $tempZip = $targetDir . '/uploads/temp_update_' . time() . '.zip';
    }

    // Download ZIP menggunakan cURL atau file_get_contents
    $downloadSuccess = false;
    if (function_exists('curl_init')) {
        $fp = @fopen($tempZip, 'w+');
        if ($fp) {
            $ch = curl_init($zipUrl);
            curl_setopt($ch, CURLOPT_TIMEOUT, 180);
            curl_setopt($ch, CURLOPT_FILE, $fp);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Siakad-Madrasah-Updater)');
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $success = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            fclose($fp);
            if ($success && $httpCode >= 200 && $httpCode < 300 && filesize($tempZip) > 1000) {
                $downloadSuccess = true;
            }
        }
    }

    if (!$downloadSuccess && ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'timeout' => 180,
                'user_agent' => 'Mozilla/5.0 (Siakad-Madrasah-Updater)'
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ]);
        $data = @file_get_contents($zipUrl, false, $context);
        if ($data && strlen($data) > 1000) {
            @file_put_contents($tempZip, $data);
            $downloadSuccess = true;
        }
    }

    if (!$downloadSuccess || !file_exists($tempZip) || filesize($tempZip) < 1000) {
        @unlink($tempZip);
        echo json_encode([
            'status' => 'error',
            'error' => 'Gagal mengunduh paket pembaruan dari GitHub. Pastikan server hosting Anda mengizinkan koneksi cURL keluar (outbound HTTPS) atau gunakan menu Git Version Control cPanel.'
        ]);
        exit();
    }

    // Ekstrak ZIP secara selektif dengan proteksi total terhadap data tersimpan
    $zip = new ZipArchive();
    if ($zip->open($tempZip) !== true) {
        @unlink($tempZip);
        echo json_encode([
            'status' => 'error',
            'error' => 'Berkas ZIP pembaruan dari GitHub rusak atau tidak dapat dibuka oleh ZipArchive.'
        ]);
        exit();
    }

    // Identifikasi folder prefix di dalam zip (biasanya Master-Siakad-main/)
    $prefix = '';
    if ($zip->numFiles > 0) {
        $firstItem = $zip->getNameIndex(0);
        if (strpos($firstItem, '/') !== false) {
            $parts = explode('/', $firstItem);
            $prefix = $parts[0] . '/';
        }
    }

    // DAFTAR HITAM: BERKAS & DIREKTORI YANG DILINDUNGI (TIDAK BOLEH DITIMPA)
    $protectedPatterns = [
        'uploads/',
        'uploads/.db_config_backup.php',
        'db_config.php',
        'db_config.local.php',
        '.env',
        '.env.local',
        'node_modules/'
    ];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entryName = $zip->getNameIndex($i);
        
        // Buang prefix folder utama zip
        $relPath = $entryName;
        if ($prefix !== '' && strpos($relPath, $prefix) === 0) {
            $relPath = substr($relPath, strlen($prefix));
        }

        if ($relPath === '' || $relPath === false) continue;

        // Cek proteksi berkas pengguna
        $isProtected = false;
        foreach ($protectedPatterns as $p) {
            if (strpos($relPath, $p) === 0 || $relPath === rtrim($p, '/')) {
                $isProtected = true;
                break;
            }
        }

        if ($isProtected) {
            $protectedSkipped++;
            continue;
        }

        $dest = $targetDir . '/' . $relPath;

        // Jika entri adalah direktori
        if (substr($entryName, -1) === '/') {
            if (!is_dir($dest)) {
                @mkdir($dest, 0755, true);
            }
            continue;
        }

        // Pastikan folder induk tersedia
        $dirName = dirname($dest);
        if (!is_dir($dirName)) {
            @mkdir($dirName, 0755, true);
        }

        // Tulis berkas baru
        $content = $zip->getFromIndex($i);
        if ($content !== false) {
            @file_put_contents($dest, $content);
            $updatedCount++;
        }
    }

    $zip->close();
    @unlink($tempZip);

    echo json_encode([
        'status' => 'success',
        'method' => 'smart_zip_extract',
        'message' => 'Pembaruan aplikasi dari GitHub berhasil dipasang!',
        'updated_files' => $updatedCount,
        'protected_files_safe' => $protectedSkipped,
        'guarantee' => 'Data database, foto/berkas di folder uploads, dan file konfigurasi koneksi tetap 100% aman dan tidak terhapus.'
    ]);
    exit();
}

echo json_encode(['status' => 'online', 'database' => 'MySQL/MariaDB', 'message' => 'API Backend Si@Kad Madrasah Aktif!']);
