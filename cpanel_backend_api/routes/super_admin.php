<?php

/**
 * Super Admin authentication against the super_admin_credentials table.
 *
 * Confirmed table schema (phpMyAdmin):
 *   id          int(11) AUTO_INCREMENT NOT NULL
 *   username    varchar(255) NOT NULL
 *   password    varchar(255) NOT NULL   ← may be plain-text or bcrypt
 *   full_name   varchar(255) NOT NULL
 *   email       varchar(255) NOT NULL
 *   is_active   tinyint(1) DEFAULT 1
 *   last_login  datetime NULL
 *   created_at  datetime NULL
 *   updated_at  datetime NULL
 */

function superadmin_starts_with(string $haystack, string $prefix): bool
{
    return $prefix !== '' && strpos($haystack, $prefix) === 0;
}

function verify_super_admin_password(string $inputPassword, string $storedPassword): bool
{
    $stored = trim($storedPassword);
    if ($stored === '') {
        return false;
    }

    // Detect hashed password (bcrypt / argon2)
    $looksHashed =
        preg_match('/^\$2[abxy]\$\d{2}\$[\.\/A-Za-z0-9]{53}$/', $stored) === 1 ||
        superadmin_starts_with($stored, '$argon2i$') ||
        superadmin_starts_with($stored, '$argon2id$');

    if ($looksHashed) {
        // Try direct verify first
        if (password_verify($inputPassword, $stored)) {
            return true;
        }
        // Try $2a$ → $2y$ normalisation (some bcrypt variants)
        if (superadmin_starts_with($stored, '$2a$')) {
            $normalised = '$2y$' . substr($stored, 4);
            if (password_verify($inputPassword, $normalised)) {
                return true;
            }
        }
        return false;
    }

    // Plain-text password stored in DB — direct comparison
    return hash_equals($stored, $inputPassword);
}

/**
 * POST /super-admin/login
 *
 * Accepts JSON: { "username": "...", "password": "..." }
 * Looks up by username OR email (case-insensitive) in super_admin_credentials.
 * Supports both plain-text and bcrypt-hashed passwords.
 */
function super_admin_login(): void
{
    $payload = get_json_input();

    if (!is_array($payload)
        || empty(trim((string)($payload['username'] ?? '')))
        || empty((string)($payload['password'] ?? ''))
    ) {
        json_response(['success' => false, 'message' => 'username and password are required'], 422);
    }

    $identity = strtolower(trim((string)$payload['username']));
    $password  = (string)$payload['password'];

    try {
        $pdo = db();

        $stmt = $pdo->prepare(
            'SELECT id, username, password, full_name, email, is_active
             FROM super_admin_credentials
             WHERE LOWER(username) = :identity_username
                OR LOWER(email)    = :identity_email
             LIMIT 1'
        );
        $stmt->execute([
            ':identity_username' => $identity,
            ':identity_email' => $identity,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

    } catch (Throwable $dbError) {
        error_log('super_admin_login DB error: ' . $dbError->getMessage());
        json_response(['success' => false, 'message' => 'Database error: ' . $dbError->getMessage()], 500);
    }

    // Account not found or inactive
    if (empty($row) || (int)($row['is_active'] ?? 0) !== 1) {
        json_response(['success' => false, 'message' => 'Invalid credentials'], 401);
    }

    $storedPassword = (string)($row['password'] ?? '');
    if (!verify_super_admin_password($password, $storedPassword)) {
        json_response(['success' => false, 'message' => 'Invalid credentials'], 401);
    }

    // Update last_login timestamp (non-fatal — ignore errors)
    try {
        $upd = $pdo->prepare(
            'UPDATE super_admin_credentials SET last_login = NOW() WHERE id = :id'
        );
        $upd->execute([':id' => $row['id']]);
    } catch (Throwable $_) {
        // intentionally ignored
    }

    json_response([
        'success' => true,
        'admin' => [
            'id'       => (int)$row['id'],
            'username' => (string)$row['username'],
            'name'     => (string)($row['full_name'] ?: $row['username']),
            'email'    => (string)$row['email'],
            'role'     => 'superadmin',
        ],
    ]);
}
