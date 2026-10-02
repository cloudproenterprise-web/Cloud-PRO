<?php
/**
 * Dynamic Open Graph & SPA Entry Point for Si@Kad Madrasah
 * Otomatis mendeteksi domain server & menyajikan meta tag Open Graph (WhatsApp, Facebook, Twitter, Telegram)
 * secara real-time dari database MySQL hosting (Plesk/cPanel) maupun fallback bawaan.
 */

// PHP 7 Compatibility Polyfills untuk mencegah error 500 di hosting cPanel versi PHP lama
@error_reporting(0);
@ini_set('display_errors', '0');

if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle !== '' && mb_strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return $needle !== '' && substr($haystack, -strlen($needle)) === (string)$needle;
    }
}

// Pastikan Browser Selalu Mengambil Versi Terbaru HTML & Asset
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Deteksi Protokol & Domain Host
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
$siteUrl = rtrim($protocol . '://' . $host, '/');
$requestUri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$requestPath = strtok($requestUri, '?');
$pageUrl = $siteUrl . '/' . ltrim($requestPath, '/');

// Default Values
$schoolName = "Si@Kad";
$ogTitle = "Si@Kad Madrasah Berbasis Digital";
$ogDescription = "Sistem Informasi Akademik Modern Membangun Generasi Qur'ani";
$ogImageUrl = $siteUrl . "/og-image-share-v2.jpeg";
$ogImageType = "image/jpeg";
$canonicalUrl = $pageUrl;

// Baca Pengaturan dari MySQL jika db_config.local.php / db_config.php sudah terpasang
if (file_exists(__DIR__ . '/db_config.local.php')) {
    include_once __DIR__ . '/db_config.local.php';
}
if (file_exists(__DIR__ . '/db_config.php')) {
    include_once __DIR__ . '/db_config.php';
}
if (!defined('DB_HOST') && file_exists(__DIR__ . '/uploads/.db_config_backup.php')) {
    include_once __DIR__ . '/uploads/.db_config_backup.php';
}
$db_host = defined('DB_HOST') ? DB_HOST : 'localhost';
$db_name = defined('DB_NAME') ? DB_NAME : 'jaenal_siakadmadrasah';
$db_user = defined('DB_USER') ? DB_USER : 'jaenal_siakadmadrah';
$db_pass = defined('DB_PASS') ? DB_PASS : 'masbagus15';

try {
        $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_SILENT,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $stmt = $pdo->prepare("SELECT id, value FROM site_settings WHERE id IN ('general', 'seo', 'identitas_madrasah')");
        if ($stmt && $stmt->execute()) {
            $rows = $stmt->fetchAll();
            $settings = [];
            foreach ($rows as $r) {
                $settings[$r['id']] = json_decode($r['value'], true);
            }

            $general = isset($settings['general']) ? $settings['general'] : [];
            $seo = isset($settings['seo']) ? $settings['seo'] : [];
            $identitas = isset($settings['identitas_madrasah']) ? $settings['identitas_madrasah'] : [];

            if (!empty($general['school_name'])) {
                $schoolName = $general['school_name'];
            }

            $metaTitle = !empty($seo['title']) ? $seo['title'] : $schoolName;
            $ogTitle = !empty($seo['og_title']) ? $seo['og_title'] : $metaTitle;

            $metaDesc = !empty($seo['description']) ? $seo['description'] : (!empty($general['tagline']) ? $general['tagline'] : $ogDescription);
            $ogDescription = !empty($seo['og_description']) ? $seo['og_description'] : $metaDesc;

            $ogDescription = trim(preg_replace('/Si@kad Madrasah Berbasis Digital diperuntukkan membantu satuan pendidikan\.?/i', '', $ogDescription));
            if (empty($ogDescription)) {
                $ogDescription = "Sistem Informasi Akademik Modern Membangun Generasi Qur'ani";
            }

            if (!empty($seo['website_url'])) {
                $configuredUrl = rtrim($seo['website_url'], '/');
                $confHost = parse_url($configuredUrl, PHP_URL_HOST);
                if (!empty($confHost) && strcasecmp($confHost, $host) === 0) {
                    $canonicalUrl = $configuredUrl . '/' . ltrim($requestPath, '/');
                } else {
                    $canonicalUrl = $siteUrl . '/' . ltrim($requestPath, '/');
                }
            } else {
                $canonicalUrl = $siteUrl . '/' . ltrim($requestPath, '/');
            }

            $rawImage = '';
            $candidates = [
                !empty($seo['image_url']) ? $seo['image_url'] : '',
                !empty($seo['og_image_url']) ? $seo['og_image_url'] : ''
            ];
            foreach ($candidates as $cand) {
                $candLower = strtolower($cand);
                if (!empty($cand) && 
                    !str_contains($candLower, 'catbox.moe') && 
                    !str_contains($candLower, 'tmpfiles.org') &&
                    !str_contains($candLower, 'litter.catbox') &&
                    !str_starts_with($candLower, 'data:')) {
                    $rawImage = $cand;
                    break;
                }
            }

            if (!empty($rawImage)) {
                if (str_starts_with($rawImage, 'http://') || str_starts_with($rawImage, 'https://')) {
                    $ogImageUrl = $rawImage;
                } else {
                    $ogImageUrl = $siteUrl . '/' . ltrim($rawImage, '/');
                }
            } else {
                $ogImageUrl = $siteUrl . "/og-image-share-v2.jpeg";
            }

            if (!empty($seo['og_image_updated_at']) && !empty($ogImageUrl)) {
                $versionParam = $seo['og_image_updated_at'];
                $timestamp = strtotime($versionParam);
                if ($timestamp !== false && $timestamp > 0) {
                    $versionParam = (string)$timestamp;
                } else {
                    $versionParam = preg_replace('/[^a-zA-Z0-9_-]/', '', $versionParam);
                }
                if (!empty($versionParam)) {
                    $ogImageUrl = preg_replace('/([?&])v=[^&]*/', '', $ogImageUrl);
                    $separator = str_contains($ogImageUrl, '?') ? '&' : '?';
                    $ogImageUrl .= $separator . 'v=' . $versionParam;
                }
            }
        }
    } catch (Throwable $e) {
        // Fallback ke default jika database belum dikonfigurasi atau belum dibuat
    }

// Tentukan MIME Type Gambar Open Graph secara Presisi
$lowerImg = strtolower($ogImageUrl);
if (str_contains($lowerImg, '.jpeg') || str_contains($lowerImg, '.jpg')) {
    $ogImageType = 'image/jpeg';
} elseif (str_contains($lowerImg, '.png')) {
    $ogImageType = 'image/png';
} elseif (str_contains($lowerImg, '.webp')) {
    $ogImageType = 'image/webp';
} else {
    $ogImageType = !empty($seo['og_image_type']) ? $seo['og_image_type'] : 'image/jpeg';
}

// Muat index.html (periksa dist/index.html terlebih dahulu untuk mendukung deployment git root di Plesk)
$htmlFile = __DIR__ . '/index.html';
if (file_exists(__DIR__ . '/dist/index.html')) {
    $htmlFile = __DIR__ . '/dist/index.html';
}

if (!file_exists($htmlFile)) {
    echo "Aplikasi belum di-build. index.html tidak ditemukan.";
    exit();
}

$html = file_get_contents($htmlFile);

// Jika index.html memuat /src/main.tsx (mode source code / git clone), otomatis substitusi dengan asset terkompilasi di assets/
if (str_contains($html, '/src/main.tsx')) {
    $foundJs = '';
    $foundCss = '';
    $assetsDir = __DIR__ . '/assets';
    if (is_dir($assetsDir)) {
        $files = scandir($assetsDir);
        foreach ($files as $f) {
            if (preg_match('/^index-[a-zA-Z0-9_-]+\.js$/i', $f)) {
                $foundJs = '/assets/' . $f;
            } elseif (preg_match('/^index-[a-zA-Z0-9_-]+\.css$/i', $f)) {
                $foundCss = '/assets/' . $f;
            }
        }
    }
    if (!empty($foundJs)) {
        $html = str_replace('<script type="module" src="/src/main.tsx"></script>', '<script type="module" crossorigin src="' . $foundJs . '"></script>', $html);
    }
    if (!empty($foundCss) && !str_contains($html, $foundCss)) {
        $html = str_replace('</head>', '  <link rel="stylesheet" crossorigin href="' . $foundCss . '">' . "\n</head>", $html);
    }
}

// Helper replacement fungsi agar pencocokan meta tag 100% fleksibel
$replaceMeta = function(&$targetHtml, $attr, $key, $val) {
    $keyEsc = preg_quote($key, '/');
    $pattern = '/<meta\s+[^>]*?' . $attr . '=["\']' . $keyEsc . '["\'][^>]*?\/?>/i';
    $replacement = '<meta ' . $attr . '="' . htmlspecialchars($key, ENT_QUOTES, 'UTF-8') . '" content="' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '" />';
    if (preg_match($pattern, $targetHtml)) {
        $targetHtml = preg_replace($pattern, $replacement, $targetHtml);
    } else {
        $targetHtml = str_replace('</head>', "  " . $replacement . "\n</head>", $targetHtml);
    }
};

$replaceLink = function(&$targetHtml, $rel, $href) {
    $relEsc = preg_quote($rel, '/');
    $pattern = '/<link\s+[^>]*?rel=["\']' . $relEsc . '["\'][^>]*?\/?>/i';
    $replacement = '<link rel="' . htmlspecialchars($rel, ENT_QUOTES, 'UTF-8') . '" href="' . htmlspecialchars($href, ENT_QUOTES, 'UTF-8') . '" />';
    if (preg_match($pattern, $targetHtml)) {
        $targetHtml = preg_replace($pattern, $replacement, $targetHtml);
    } else {
        $targetHtml = str_replace('</head>', "  " . $replacement . "\n</head>", $targetHtml);
    }
};

// Ganti Tag Placeholder jika ada
$html = str_replace('__SITE_URL__', $siteUrl, $html);
$html = str_replace('__CANONICAL_URL__', htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__META_TITLE__', htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__META_DESCRIPTION__', htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__OG_TITLE__', htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__OG_DESCRIPTION__', htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__TWITTER_TITLE__', htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__TWITTER_DESCRIPTION__', htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__OG_IMAGE_URL__', htmlspecialchars($ogImageUrl, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__OG_IMAGE_TYPE__', htmlspecialchars($ogImageType, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__SITE_NAME__', htmlspecialchars($schoolName, ENT_QUOTES, 'UTF-8'), $html);
$html = str_replace('__IMAGE_ALT__', htmlspecialchars($schoolName, ENT_QUOTES, 'UTF-8'), $html);

// Override Tag Meta Static di index.html secara presisi dan fleksibel
if (preg_match('/<title>[^<]*<\/title>/i', $html)) {
    $html = preg_replace('/<title>[^<]*<\/title>/i', '<title>' . htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8') . '</title>', $html);
}

$replaceMeta($html, 'name', 'description', $ogDescription);
$replaceMeta($html, 'property', 'og:type', 'website');
$replaceMeta($html, 'property', 'og:locale', 'id_ID');
$replaceMeta($html, 'property', 'og:site_name', $schoolName);
$replaceMeta($html, 'property', 'og:title', $ogTitle);
$replaceMeta($html, 'property', 'og:description', $ogDescription);
$replaceMeta($html, 'property', 'og:url', $canonicalUrl);
$replaceMeta($html, 'property', 'og:image', $ogImageUrl);
$replaceMeta($html, 'property', 'og:image:url', $ogImageUrl);
$replaceMeta($html, 'property', 'og:image:secure_url', $ogImageUrl);
$replaceMeta($html, 'property', 'og:image:width', '1200');
$replaceMeta($html, 'property', 'og:image:height', '630');
$replaceMeta($html, 'property', 'og:image:type', $ogImageType);
$replaceMeta($html, 'property', 'og:image:alt', $schoolName);

$replaceMeta($html, 'name', 'twitter:card', 'summary_large_image');
$replaceMeta($html, 'name', 'twitter:title', $ogTitle);
$replaceMeta($html, 'name', 'twitter:description', $ogDescription);
$replaceMeta($html, 'name', 'twitter:image', $ogImageUrl);
$replaceMeta($html, 'name', 'twitter:image:alt', $schoolName);
$replaceMeta($html, 'name', 'twitter:url', $canonicalUrl);

$replaceLink($html, 'canonical', $canonicalUrl);
$replaceLink($html, 'image_src', $ogImageUrl);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
echo $html;
