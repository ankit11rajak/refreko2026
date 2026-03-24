<?php

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
        } else {
            json_response(['success' => false, 'message' => 'Unknown action'], 400);
        }
    } elseif ($method === 'POST') {
        if ($action === 'update') {
            system_settings_update();
        } else {
            json_response(['success' => false, 'message' => 'Unknown action'], 400);
        }
    } else {
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
    }
}
