<?php

require_once __DIR__ . '/response.php';

function store_payment_proof(string $fieldName = 'screenshot'): array
{
    if (!isset($_FILES[$fieldName]) || !is_array($_FILES[$fieldName])) {
        throw new Exception('No upload file found');
    }

    $file = $_FILES[$fieldName];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new Exception('Upload failed with error code: ' . ($file['error'] ?? UPLOAD_ERR_NO_FILE));
    }

    $config = require __DIR__ . '/../config/env.php';
    $uploadDir = $config['upload_dir'];
    $maxBytes = ((int)($config['max_upload_mb'] ?? 10)) * 1024 * 1024;

    if (($file['size'] ?? 0) > $maxBytes) {
        throw new Exception('File too large (max ' . ($config['max_upload_mb'] ?? 10) . 'MB)');
    }

    $mime = mime_content_type($file['tmp_name']);
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed, true)) {
        throw new Exception('Only JPG/PNG/WEBP allowed');
    }

    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
        throw new Exception('Upload directory not writable: ' . $uploadDir);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = 'proof_' . bin2hex(random_bytes(12)) . ($ext ? '.' . strtolower($ext) : '');
    $target = rtrim($uploadDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $safeName;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        throw new Exception('Unable to save file to: ' . $target);
    }

    $relativePath = rtrim($config['base_upload_url'], '/') . '/' . $safeName;

    return [
        'relative_path' => $relativePath,
        'stored_name' => $safeName,
        'original_name' => $file['name'] ?? $safeName,
        'mime' => $mime,
        'size' => $file['size'] ?? 0,
    ];
}
