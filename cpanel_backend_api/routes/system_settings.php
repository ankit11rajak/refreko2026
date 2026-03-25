<?php

function system_settings_gallery_candidates(): array
{
    $paths = [];

    // Static relative candidates from current backend route structure.
    $paths[] = __DIR__ . '/../../public/gallery';
    $paths[] = __DIR__ . '/../public/gallery';
    $paths[] = __DIR__ . '/../../../public/gallery';

    // Dynamic candidates for common hosting layouts (cPanel, shared hosting, monorepo variants).
    $parentChain = [];
    $current = __DIR__;
    for ($i = 0; $i < 8; $i++) {
        $resolved = realpath($current);
        if ($resolved === false) {
            break;
        }
        $normalizedRoot = str_replace('\\', '/', $resolved);
        if (!in_array($normalizedRoot, $parentChain, true)) {
            $parentChain[] = $normalizedRoot;
        }
        $next = dirname($current);
        if ($next === $current) {
            break;
        }
        $current = $next;
    }

    foreach ($parentChain as $root) {
        $paths[] = $root . '/public/gallery';
        $paths[] = $root . '/public_html/gallery';
        $paths[] = $root . '/htdocs/gallery';
        $paths[] = $root . '/www/gallery';
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && trim($documentRoot) !== '') {
        $paths[] = rtrim($documentRoot, '/\\') . '/gallery';
    }

    $normalized = [];
    foreach ($paths as $path) {
        $clean = str_replace('\\', '/', preg_replace('#/+#', '/', $path));
        if (is_string($clean) && $clean !== '' && !in_array($clean, $normalized, true)) {
            $normalized[] = $clean;
        }
    }

    return $normalized;
}

function system_settings_gallery_existing_directories(): array
{
    $result = [];
    foreach (system_settings_gallery_candidates() as $candidate) {
        if (!is_dir($candidate)) {
            continue;
        }
        $realPath = realpath($candidate);
        if ($realPath === false) {
            continue;
        }
        $normalized = str_replace('\\', '/', $realPath);
        if (!in_array($normalized, $result, true)) {
            $result[] = $normalized;
        }
    }
    return $result;
}

function system_settings_public_image_directories(): array
{
    $paths = [];

    $parentChain = [];
    $current = __DIR__;
    for ($i = 0; $i < 8; $i++) {
        $resolved = realpath($current);
        if ($resolved === false) {
            break;
        }
        $normalizedRoot = str_replace('\\', '/', $resolved);
        if (!in_array($normalizedRoot, $parentChain, true)) {
            $parentChain[] = $normalizedRoot;
        }
        $next = dirname($current);
        if ($next === $current) {
            break;
        }
        $current = $next;
    }

    foreach ($parentChain as $root) {
        $paths[] = $root . '/public';
        $paths[] = $root . '/public_html';
        $paths[] = $root . '/htdocs';
        $paths[] = $root . '/www';
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && trim($documentRoot) !== '') {
        $paths[] = rtrim($documentRoot, '/\\');
    }

    $result = [];
    foreach ($paths as $path) {
        $clean = str_replace('\\', '/', preg_replace('#/+#', '/', $path));
        if (!is_string($clean) || $clean === '' || !is_dir($clean)) {
            continue;
        }
        $realPath = realpath($clean);
        if ($realPath === false) {
            continue;
        }
        $normalized = str_replace('\\', '/', $realPath);
        if (!in_array($normalized, $result, true)) {
            $result[] = $normalized;
        }
    }

    return $result;
}

function system_settings_gallery_image_sources(): array
{
    $sources = [];

    foreach (system_settings_gallery_existing_directories() as $dir) {
        $sources[] = [
            'dir' => $dir,
            'mode' => 'gallery_subdir',
        ];
    }

    foreach (system_settings_public_image_directories() as $dir) {
        $sources[] = [
            'dir' => $dir,
            'mode' => 'public_root',
        ];
    }

    $deduped = [];
    $seen = [];
    foreach ($sources as $source) {
        $key = $source['mode'] . '|' . $source['dir'];
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $deduped[] = $source;
    }

    return $deduped;
}

function system_settings_image_public_url(string $mode, string $fileName): string
{
    if ($mode === 'gallery_subdir') {
        return '/gallery/' . rawurlencode($fileName);
    }
    return '/' . rawurlencode($fileName);
}

function system_settings_gallery_primary_directory(bool $createIfMissing = false): ?string
{
    $existing = system_settings_gallery_existing_directories();
    if (count($existing) > 0) {
        foreach ($existing as $dir) {
            if (is_writable($dir)) {
                return $dir;
            }
        }
        return $existing[0];
    }

    if (!$createIfMissing) {
        return null;
    }

    foreach (system_settings_gallery_candidates() as $candidate) {
        if (@mkdir($candidate, 0755, true) || is_dir($candidate)) {
            $realPath = realpath($candidate);
            if ($realPath !== false) {
                return str_replace('\\', '/', $realPath);
            }
        }
    }

    return null;
}

function system_settings_is_allowed_gallery_image(string $filename): bool
{
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true);
}

function system_settings_gallery_human_size(int $bytes): string
{
    if ($bytes < 1024) {
        return $bytes . ' B';
    }
    if ($bytes < 1024 * 1024) {
        return round($bytes / 1024, 1) . ' KB';
    }
    return round($bytes / (1024 * 1024), 1) . ' MB';
}

function system_settings_gallery_list(): void
{
    $sources = system_settings_gallery_image_sources();
    $filesByName = [];
    $debugEnabled = (isset($_GET['debug']) && (string)$_GET['debug'] === '1');

    foreach ($sources as $source) {
        $dir = (string)$source['dir'];
        $mode = (string)$source['mode'];
        $entries = @scandir($dir);
        if ($entries === false) {
            continue;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..' || $entry === '.gitkeep' || $entry === 'README.md') {
                continue;
            }

            if (!system_settings_is_allowed_gallery_image($entry)) {
                continue;
            }

            $fullPath = $dir . '/' . $entry;
            if (!is_file($fullPath)) {
                continue;
            }

            $modifiedAt = (int)filemtime($fullPath);
            $existing = $filesByName[$entry] ?? null;
            if ($existing !== null && isset($existing['modified_at_ts']) && $existing['modified_at_ts'] >= $modifiedAt) {
                continue;
            }

            $sizeBytes = (int)filesize($fullPath);
            $filesByName[$entry] = [
                'name' => $entry,
                'size_bytes' => $sizeBytes,
                'size_label' => system_settings_gallery_human_size($sizeBytes),
                'modified_at' => date('c', $modifiedAt),
                'modified_at_ts' => $modifiedAt,
                'public_url' => system_settings_image_public_url($mode, $entry),
            ];
        }
    }

    $files = array_values($filesByName);

    usort($files, static function (array $a, array $b): int {
        $aTime = strtotime((string)($a['modified_at'] ?? '')) ?: 0;
        $bTime = strtotime((string)($b['modified_at'] ?? '')) ?: 0;
        return $bTime <=> $aTime;
    });

    foreach ($files as &$file) {
        unset($file['modified_at_ts']);
    }
    unset($file);

    $response = [
        'success' => true,
        'files' => $files,
        'total' => count($files),
    ];

    if ($debugEnabled) {
        $response['debug'] = [
            'scanned_sources' => $sources,
            'candidate_directories' => system_settings_gallery_candidates(),
        ];
    }

    json_response($response);
}

function system_settings_gallery_upload(): void
{
    $galleryDir = system_settings_gallery_primary_directory(true);
    if ($galleryDir === null) {
        json_response(['success' => false, 'message' => 'Gallery directory is not available'], 500);
    }

    if (!isset($_FILES['image'])) {
        json_response(['success' => false, 'message' => 'Missing file: image'], 422);
    }

    $file = $_FILES['image'];
    $uploadError = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError !== UPLOAD_ERR_OK) {
        json_response(['success' => false, 'message' => 'Image upload failed'], 422);
    }

    $originalName = (string)($file['name'] ?? '');
    if (!system_settings_is_allowed_gallery_image($originalName)) {
        json_response(['success' => false, 'message' => 'Only JPG, JPEG, PNG, WEBP, and GIF files are allowed'], 422);
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    $sizeBytes = (int)($file['size'] ?? 0);
    if ($sizeBytes <= 0) {
        json_response(['success' => false, 'message' => 'Uploaded image is empty'], 422);
    }

    if ($sizeBytes > 15 * 1024 * 1024) {
        json_response(['success' => false, 'message' => 'Image is too large. Max size is 15 MB'], 422);
    }

    $baseName = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($originalName));
    if ($baseName === null || $baseName === '') {
        $baseName = 'gallery_image_' . date('Ymd_His') . '.jpg';
    }

    $finalName = $baseName;
    $targetPath = $galleryDir . '/' . $finalName;
    $counter = 1;
    while (file_exists($targetPath)) {
        $nameWithoutExt = pathinfo($baseName, PATHINFO_FILENAME);
        $extension = pathinfo($baseName, PATHINFO_EXTENSION);
        $suffix = '_' . date('Ymd_His') . '_' . $counter;
        $finalName = $extension !== '' ? ($nameWithoutExt . $suffix . '.' . $extension) : ($nameWithoutExt . $suffix);
        $targetPath = $galleryDir . '/' . $finalName;
        $counter++;
    }

    if (!@move_uploaded_file($tmpPath, $targetPath)) {
        json_response(['success' => false, 'message' => 'Unable to save uploaded image'], 500);
    }

    json_response([
        'success' => true,
        'message' => 'Gallery image uploaded successfully',
        'file' => [
            'name' => $finalName,
            'size_bytes' => (int)filesize($targetPath),
            'size_label' => system_settings_gallery_human_size((int)filesize($targetPath)),
            'modified_at' => date('c', (int)filemtime($targetPath)),
            'public_url' => '/gallery/' . rawurlencode($finalName),
        ],
    ]);
}

function system_settings_gallery_delete(): void
{
    $payload = get_json_input();
    require_fields($payload, ['image_name']);

    $imageName = trim((string)$payload['image_name']);
    $safeName = basename($imageName);
    if ($safeName === '' || $safeName !== $imageName || !system_settings_is_allowed_gallery_image($safeName)) {
        json_response(['success' => false, 'message' => 'Invalid image name'], 422);
    }

    $targetPath = null;
    foreach (system_settings_gallery_image_sources() as $source) {
        $candidate = ((string)$source['dir']) . '/' . $safeName;
        if (is_file($candidate)) {
            $targetPath = $candidate;
            break;
        }
    }

    if ($targetPath === null) {
        json_response(['success' => false, 'message' => 'Image not found'], 404);
    }

    if (!@unlink($targetPath)) {
        json_response(['success' => false, 'message' => 'Unable to delete gallery image'], 500);
    }

    json_response([
        'success' => true,
        'message' => 'Gallery image deleted successfully',
        'image_name' => $safeName,
    ]);
}

function ensure_system_settings_table(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value VARCHAR(255) NOT NULL,
        setting_type ENUM('boolean','string','integer') NOT NULL DEFAULT 'string',
        description VARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $seed = $pdo->prepare('INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
                           VALUES (:setting_key, :setting_value, :setting_type, :description)
                           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP');

    $defaults = [
        [
            'setting_key' => 'payment_acceptance_enabled',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'Enable or disable student payment submissions and Make Payment access',
        ],
        [
            'setting_key' => 'gate_pass_visibility_enabled',
            'setting_value' => '0',
            'setting_type' => 'boolean',
            'description' => 'When enabled, all gate passes are visible on student dashboard regardless of payment status',
        ],
        [
            'setting_key' => 'label_generation_enabled',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'Enable or disable automatic label generation for gate entries',
        ],
        [
            'setting_key' => 'gate_scanner_auto_grant_enabled',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'When enabled, scanned students are auto-granted entry if valid',
        ],
        [
            'setting_key' => 'allow_manual_student_code_entry',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'Allow volunteers to grant entry through manual student code input',
        ],
        [
            'setting_key' => 'gate_entry_duplicate_check_enabled',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'Prevent duplicate entry marking for the same student on the same day',
        ],
        [
            'setting_key' => 'gate_pass_unpaid_terms_required_enabled',
            'setting_value' => '1',
            'setting_type' => 'boolean',
            'description' => 'When gate pass visibility is enabled, unpaid students must accept terms before viewing pass',
        ],
        [
            'setting_key' => 'max_gate_entries_export_limit',
            'setting_value' => '50000',
            'setting_type' => 'integer',
            'description' => 'Maximum rows allowed during gate entry export operations',
        ],
    ];

    foreach ($defaults as $row) {
        $seed->execute([
            ':setting_key' => $row['setting_key'],
            ':setting_value' => $row['setting_value'],
            ':setting_type' => $row['setting_type'],
            ':description' => $row['description'],
        ]);
    }
}

/**
 * Get all system settings
 */
function system_settings_get_all(): void
{
    $pdo = db();
    ensure_system_settings_table($pdo);
    $stmt = $pdo->query('SELECT setting_key, setting_value, setting_type, description FROM system_settings ORDER BY setting_key ASC');
    $rows = $stmt->fetchAll();

    $settings = [];
    foreach ($rows as $row) {
        $value = $row['setting_value'];
        // Convert boolean string to actual boolean
        if ($row['setting_type'] === 'boolean') {
            $value = (int)$value === 1 ? true : false;
        } elseif ($row['setting_type'] === 'integer') {
            $value = (int)$value;
        }
        $settings[$row['setting_key']] = [
            'value' => $value,
            'type' => $row['setting_type'],
            'description' => $row['description']
        ];
    }

    json_response([
        'success' => true,
        'settings' => $settings
    ]);
}

/**
 * Get a specific setting by key
 */
function system_settings_get(): void
{
    $payload = get_json_input();
    $settingKey = trim((string)($payload['setting_key'] ?? ($_GET['setting_key'] ?? '')));
    if ($settingKey === '') {
        json_response(['success' => false, 'message' => 'Missing field: setting_key'], 422);
    }

    $pdo = db();
    ensure_system_settings_table($pdo);
    $stmt = $pdo->prepare('SELECT setting_key, setting_value, setting_type, description FROM system_settings WHERE setting_key = :key');
    $stmt->execute([':key' => $settingKey]);
    $row = $stmt->fetch();

    if (!$row) {
        json_response(['success' => false, 'message' => 'Setting not found'], 404);
        return;
    }

    $value = $row['setting_value'];
    // Convert boolean string to actual boolean
    if ($row['setting_type'] === 'boolean') {
        $value = (int)$value === 1 ? true : false;
    } elseif ($row['setting_type'] === 'integer') {
        $value = (int)$value;
    }

    json_response([
        'success' => true,
        'setting' => [
            'key' => $row['setting_key'],
            'value' => $value,
            'type' => $row['setting_type'],
            'description' => $row['description']
        ]
    ]);
}

/**
 * Update a system setting
 */
function system_settings_update(): void
{
    $payload = get_json_input();
    require_fields($payload, ['setting_key', 'setting_value']);

    $settingKey = trim((string)$payload['setting_key']);
    $settingValue = trim((string)$payload['setting_value']);

    if (empty($settingKey)) {
        json_response(['success' => false, 'message' => 'Invalid setting key'], 422);
        return;
    }

    $pdo = db();
    ensure_system_settings_table($pdo);
    
    // First check if setting exists
    $stmt = $pdo->prepare('SELECT id FROM system_settings WHERE setting_key = :key');
    $stmt->execute([':key' => $settingKey]);
    $existing = $stmt->fetch();

    if (!$existing) {
        json_response(['success' => false, 'message' => 'Setting not found'], 404);
        return;
    }

    // Update the setting
    $stmt = $pdo->prepare('UPDATE system_settings SET setting_value = :value, updated_at = CURRENT_TIMESTAMP WHERE setting_key = :key');
    $stmt->execute([
        ':value' => $settingValue,
        ':key' => $settingKey
    ]);

    json_response([
        'success' => true,
        'message' => 'Setting updated successfully'
    ]);
}

/**
 * Route dispatcher for system settings
 */
function route_system_settings(): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'get_all';

    if ($method === 'GET') {
        if ($action === 'get_all') {
            system_settings_get_all();
        } elseif ($action === 'get') {
            system_settings_get();
        } elseif ($action === 'gallery_list') {
            system_settings_gallery_list();
        } else {
            json_response(['success' => false, 'message' => 'Unknown action'], 400);
        }
    } elseif ($method === 'POST') {
        if ($action === 'update') {
            system_settings_update();
        } elseif ($action === 'gallery_upload') {
            system_settings_gallery_upload();
        } elseif ($action === 'gallery_delete') {
            system_settings_gallery_delete();
        } else {
            json_response(['success' => false, 'message' => 'Unknown action'], 400);
        }
    } else {
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}
