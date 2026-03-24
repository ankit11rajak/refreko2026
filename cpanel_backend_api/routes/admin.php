<?php

function admin_login(): void
{
    $payload = get_json_input();
    if (!isset($payload['password']) || (!isset($payload['email']) && !isset($payload['username']))) {
        json_response(['success' => false, 'message' => 'Missing required fields'], 422);
    }

    $identity = strtolower(trim((string)($payload['email'] ?? $payload['username'] ?? '')));
    $password = (string)$payload['password'];

    if ($identity === '') {
        json_response(['success' => false, 'message' => 'Email or username is required'], 422);
    }

    $pdo = db();

    $stmt = $pdo->prepare('SELECT id, display_name, email, password_hash, role, is_active FROM admin_users WHERE LOWER(email) = :identity LIMIT 1');
    $stmt->execute([':identity' => $identity]);
    $admin = $stmt->fetch();

    if (!$admin || (int)$admin['is_active'] !== 1 || !password_verify($password, (string)$admin['password_hash'])) {
        json_response(['success' => false, 'message' => 'Invalid credentials'], 401);
    }

    json_response([
        'success' => true,
        'admin' => [
            'id' => $admin['id'],
            'name' => $admin['display_name'] ?: $admin['email'],
            'email' => $admin['email'],
            'role' => $admin['role'],
        ]
    ]);
}

function admin_create(): void
{
    try {
        $payload = get_json_input();
        require_fields($payload, ['email', 'password', 'role']);

        $name = trim((string)($payload['name'] ?? ''));
        $email = strtolower(trim((string)$payload['email']));
        $password = (string)$payload['password'];
        $role = strtolower(trim((string)$payload['role']));

        if (!in_array($role, ['admin', 'superadmin'], true)) {
            json_response(['success' => false, 'message' => 'Invalid role'], 422);
        }

        if (strlen($password) < 8) {
            json_response(['success' => false, 'message' => 'Password must be at least 8 characters'], 422);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        if ($name === '') {
            $name = $email;
        }

        $pdo = db();
        
        // Check if table exists, if not create it automatically
        $checkTable = $pdo->query("SHOW TABLES LIKE 'admin_users'")->fetch();
        if (!$checkTable) {
            // Create the admin_users table
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS admin_users (
                  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                  display_name VARCHAR(120) NULL,
                  email VARCHAR(160) NOT NULL UNIQUE,
                  password_hash VARCHAR(255) NOT NULL,
                  role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
                  is_active TINYINT(1) NOT NULL DEFAULT 1,
                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $pdo->exec($createTableSql);
            error_log('admin_users table created automatically');
        } else {
            // Table exists - check and add missing columns if needed
            try {
                // Check if display_name column exists
                $columns = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'display_name'")->fetch();
                if (!$columns) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN display_name VARCHAR(120) NULL AFTER id");
                    error_log('Added display_name column to admin_users table');
                }
                
                // Check if role column exists
                $roleColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'role'")->fetch();
                if (!$roleColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin' AFTER password_hash");
                    error_log('Added role column to admin_users table');
                }
                
                // Check if is_active column exists
                $activeColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'is_active'")->fetch();
                if (!$activeColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");
                    error_log('Added is_active column to admin_users table');
                }
                
                // Check if created_at column exists
                $createdColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'created_at'")->fetch();
                if (!$createdColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active");
                    error_log('Added created_at column to admin_users table');
                }
                
                // Check if updated_at column exists
                $updatedColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'updated_at'")->fetch();
                if (!$updatedColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
                    error_log('Added updated_at column to admin_users table');
                }
            } catch (PDOException $e) {
                error_log('Schema migration warning: ' . $e->getMessage());
            }
        }
        
        $stmt = $pdo->prepare('INSERT INTO admin_users (display_name, email, password_hash, role, is_active)
                               VALUES (:display_name, :email, :password_hash, :role, 1)');

        $stmt->execute([
            ':display_name' => $name,
            ':email' => $email,
            ':password_hash' => $hash,
            ':role' => $role,
        ]);

        $actor = isset($payload['actor']) ? (string)$payload['actor'] : null;
        log_event('admin_create', 'admin_user', (string)$pdo->lastInsertId(), ['email' => $email, 'role' => $role], $actor);

        json_response(['success' => true, 'message' => 'Admin created'], 201);
    } catch (PDOException $error) {
        // Check for duplicate email error
        if ($error->getCode() === '23000') {
            json_response(['success' => false, 'message' => 'Email already exists'], 409);
        }
        json_response(['success' => false, 'message' => 'Database error: ' . $error->getMessage()], 500);
    } catch (Throwable $error) {
        json_response(['success' => false, 'message' => 'Unable to create admin: ' . $error->getMessage()], 500);
    }
}

function admin_list(): void
{
    try {
        $pdo = db();
        
        // Check if table exists, if not create it automatically
        $checkTable = $pdo->query("SHOW TABLES LIKE 'admin_users'")->fetch();
        if (!$checkTable) {
            // Create the admin_users table
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS admin_users (
                  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                  display_name VARCHAR(120) NULL,
                  email VARCHAR(160) NOT NULL UNIQUE,
                  password_hash VARCHAR(255) NOT NULL,
                  role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
                  is_active TINYINT(1) NOT NULL DEFAULT 1,
                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $pdo->exec($createTableSql);
            error_log('admin_users table created automatically');
            
            // Return empty list since table was just created
            json_response(['success' => true, 'admins' => []]);
            return;
        } else {
            // Table exists - check and add missing columns if needed
            try {
                // Check if display_name column exists
                $columns = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'display_name'")->fetch();
                if (!$columns) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN display_name VARCHAR(120) NULL AFTER id");
                    error_log('Added display_name column to admin_users table');
                }
                
                // Check if role column exists
                $roleColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'role'")->fetch();
                if (!$roleColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin' AFTER password_hash");
                    error_log('Added role column to admin_users table');
                }
                
                // Check if is_active column exists
                $activeColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'is_active'")->fetch();
                if (!$activeColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role");
                    error_log('Added is_active column to admin_users table');
                }
                
                // Check if created_at column exists
                $createdColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'created_at'")->fetch();
                if (!$createdColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active");
                    error_log('Added created_at column to admin_users table');
                }
                
                // Check if updated_at column exists
                $updatedColumn = $pdo->query("SHOW COLUMNS FROM admin_users LIKE 'updated_at'")->fetch();
                if (!$updatedColumn) {
                    $pdo->exec("ALTER TABLE admin_users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
                    error_log('Added updated_at column to admin_users table');
                }
            } catch (PDOException $e) {
                error_log('Schema migration warning: ' . $e->getMessage());
            }
        }
        
        $stmt = $pdo->query('SELECT id, display_name, email, role, is_active, created_at
                             FROM admin_users
                             ORDER BY id DESC');
        $rows = $stmt->fetchAll();

        $admins = array_map(static function (array $row): array {
            return [
                'id' => 'ADM' . $row['id'],
                'db_id' => (int)$row['id'],
                'name' => $row['display_name'] ?: $row['email'],
                'email' => $row['email'],
                'role' => $row['role'],
                'status' => ((int)$row['is_active'] === 1) ? 'active' : 'inactive',
                'createdAt' => $row['created_at'],
            ];
        }, $rows);

        log_event('admin_list', 'admin_user', null, ['count' => count($admins)]);

        json_response(['success' => true, 'admins' => $admins]);
    } catch (Throwable $error) {
        json_response([
            'success' => false, 
            'message' => 'Database error: ' . $error->getMessage(),
            'hint' => 'Make sure admin_users table exists. Run cpanel_backend_api/sql/04_create_admin_table.sql'
        ], 500);
    }
}

function admin_update(): void
{
    $payload = get_json_input();
    require_fields($payload, ['admin_id']);

    $rawId = trim((string)$payload['admin_id']);
    $dbId = (int)preg_replace('/[^0-9]/', '', $rawId);
    if ($dbId <= 0) {
        json_response(['success' => false, 'message' => 'Invalid admin_id'], 422);
    }

    $hasStatus = array_key_exists('status', $payload);
    $hasPassword = array_key_exists('password', $payload);
    $hasName = array_key_exists('name', $payload);

    if (!$hasStatus && !$hasPassword && !$hasName) {
        json_response(['success' => false, 'message' => 'No updates provided'], 422);
    }

    $updates = [];
    $params = [':id' => $dbId];

    if ($hasStatus) {
        $status = strtolower(trim((string)$payload['status']));
        if (!in_array($status, ['active', 'inactive'], true)) {
            json_response(['success' => false, 'message' => 'Invalid status'], 422);
        }
        $updates[] = 'is_active = :is_active';
        $params[':is_active'] = $status === 'active' ? 1 : 0;
    }

    if ($hasPassword) {
        $password = trim((string)$payload['password']);
        if (strlen($password) < 8) {
            json_response(['success' => false, 'message' => 'Password must be at least 8 characters'], 422);
        }
        $updates[] = 'password_hash = :password_hash';
        $params[':password_hash'] = password_hash($password, PASSWORD_BCRYPT);
    }

    if ($hasName) {
        $name = trim((string)$payload['name']);
        if ($name === '') {
            json_response(['success' => false, 'message' => 'Name cannot be empty'], 422);
        }
        $updates[] = 'display_name = :display_name';
        $params[':display_name'] = $name;
    }

    $sql = 'UPDATE admin_users SET ' . implode(', ', $updates) . ' WHERE id = :id';
    $pdo = db();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        json_response(['success' => false, 'message' => 'Admin not found or unchanged'], 404);
    }

    $meta = [];
    if ($hasStatus) {
        $meta['status'] = $status;
    }
    if ($hasName) {
        $meta['name'] = $name;
    }
    $actor = isset($payload['actor']) ? (string)$payload['actor'] : null;
    log_event('admin_update', 'admin_user', (string)$dbId, $meta, $actor);

    json_response(['success' => true, 'message' => 'Admin updated']);
}

function admin_delete(): void
{
    $payload = get_json_input();
    require_fields($payload, ['admin_id']);

    $rawId = trim((string)$payload['admin_id']);
    $dbId = (int)preg_replace('/[^0-9]/', '', $rawId);
    if ($dbId <= 0) {
        json_response(['success' => false, 'message' => 'Invalid admin_id'], 422);
    }

    $pdo = db();
    $stmt = $pdo->prepare('DELETE FROM admin_users WHERE id = :id');
    $stmt->execute([':id' => $dbId]);

    if ($stmt->rowCount() === 0) {
        json_response(['success' => false, 'message' => 'Admin not found'], 404);
    }

    $actor = isset($payload['actor']) ? (string)$payload['actor'] : null;
    log_event('admin_delete', 'admin_user', (string)$dbId, [], $actor);

    json_response(['success' => true, 'message' => 'Admin deleted']);
}

function admin_gate_entries(): void
{
    try {
        $pdo = db();

        // Ensure legacy databases include payment_status for analytics filtering.
        try {
            $paymentStatusColumn = $pdo->query("SHOW COLUMNS FROM gate_entry_records LIKE 'payment_status'")->fetch();
            if (!$paymentStatusColumn) {
                $pdo->exec("ALTER TABLE gate_entry_records ADD COLUMN payment_status ENUM('paid','not_paid') NULL DEFAULT NULL AFTER entry_method");
            }
        } catch (Throwable $migrationError) {
            error_log('admin_gate_entries schema migration warning (payment_status): ' . $migrationError->getMessage());
        }

        $entryDate = trim((string)($_GET['entry_date'] ?? ''));
        $search = trim((string)($_GET['search'] ?? ''));
        $paymentStatus = strtolower(trim((string)($_GET['payment_status'] ?? '')));
        $allRecords = in_array(strtolower(trim((string)($_GET['all'] ?? '0'))), ['1', 'true', 'yes'], true);

        $limit = (int)($_GET['limit'] ?? 500);
        $offset = (int)($_GET['offset'] ?? 0);
        $limit = max(1, min(50000, $limit));
        $offset = max(0, $offset);

        $where = [];
        $params = [];

        if (!$allRecords && $entryDate !== '') {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $entryDate) !== 1) {
                json_response(['success' => false, 'message' => 'entry_date must be YYYY-MM-DD'], 422);
            }
            $where[] = 'entry_date = :entry_date';
            $params[':entry_date'] = $entryDate;
        }

        if ($search !== '') {
            $where[] = '(UPPER(COALESCE(student_code, "")) LIKE :search
                        OR UPPER(COALESCE(student_name, "")) LIKE :search
                        OR UPPER(COALESCE(student_department, "")) LIKE :search
                        OR UPPER(COALESCE(student_year, "")) LIKE :search
                        OR UPPER(COALESCE(entry_by, "")) LIKE :search)';
            $params[':search'] = '%' . strtoupper($search) . '%';
        }

        if (in_array($paymentStatus, ['paid', 'not_paid'], true)) {
            $where[] = 'COALESCE(payment_status, "not_paid") = :payment_status';
            $params[':payment_status'] = $paymentStatus;
        }

        $whereSql = '';
        if (!empty($where)) {
            $whereSql = ' WHERE ' . implode(' AND ', $where);
        }

        $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM gate_entry_records' . $whereSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $countStmt->execute();
        $countRow = $countStmt->fetch();
        $total = (int)($countRow['total'] ?? 0);

        $sql = 'SELECT id,
                       student_code,
                       student_name,
                       student_department,
                       student_year,
                       entry_date,
                       entry_at,
                       entry_by,
                       entry_method,
                  COALESCE(payment_status, "not_paid") AS payment_status,
                       created_at
                FROM gate_entry_records'
             . $whereSql .
               ' ORDER BY entry_date DESC, entry_at DESC
                 LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        json_response([
            'success' => true,
            'records' => is_array($rows) ? $rows : [],
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + (is_array($rows) ? count($rows) : 0)) < $total,
        ]);
    } catch (Throwable $error) {
        json_response([
            'success' => false,
            'message' => 'Unable to fetch gate entry records',
            'error' => $error->getMessage(),
        ], 500);
    }
}

function admin_gate_entry_delete(): void
{
    $payload = get_json_input();
    require_fields($payload, ['entry_id']);

    $entryId = (int)($payload['entry_id'] ?? 0);
    if ($entryId <= 0) {
        json_response(['success' => false, 'message' => 'Valid entry_id is required'], 422);
    }

    try {
        $pdo = db();
        $stmt = $pdo->prepare('DELETE FROM gate_entry_records WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $entryId]);

        if ($stmt->rowCount() === 0) {
            json_response(['success' => false, 'message' => 'Entry not found'], 404);
        }

        json_response([
            'success' => true,
            'message' => 'Gate entry deleted successfully',
            'entry_id' => $entryId,
        ]);
    } catch (Throwable $error) {
        json_response([
            'success' => false,
            'message' => 'Unable to delete gate entry',
            'error' => $error->getMessage(),
        ], 500);
    }
}
