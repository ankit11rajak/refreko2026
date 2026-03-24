<?php

function staff_table_has_column(PDO $pdo, string $tableName, string $columnName): bool
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $tableName) || !preg_match('/^[a-zA-Z0-9_]+$/', $columnName)) {
        return false;
    }

    $sql = sprintf('SHOW COLUMNS FROM `%s` LIKE %s', $tableName, $pdo->quote($columnName));
    $stmt = $pdo->query($sql);
    return $stmt ? (bool)$stmt->fetch() : false;
}

function staff_scope_columns_available(PDO $pdo): bool
{
    return staff_table_has_column($pdo, 'event_staff_users', 'department_scope')
        && staff_table_has_column($pdo, 'event_staff_users', 'year_scope');
}

function staff_table_exists(PDO $pdo, string $tableName): bool
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $tableName)) {
        return false;
    }

    $sql = sprintf('SHOW TABLES LIKE %s', $pdo->quote($tableName));
    $stmt = $pdo->query($sql);
    return $stmt ? (bool)$stmt->fetch() : false;
}

function staff_student_table_name(PDO $pdo): string
{
    if (staff_table_exists($pdo, 'student_details')) {
        return 'student_details';
    }

    if (staff_table_exists($pdo, 'students')) {
        return 'students';
    }

    return 'student_details';
}

function ensure_staff_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS event_staff_users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        username VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('cr','volunteer') NOT NULL,
        department_scope VARCHAR(120) NULL,
        year_scope VARCHAR(30) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        auth_token VARCHAR(128) NULL,
        token_expires_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_staff_role (role),
        INDEX idx_staff_auth_token (auth_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS gate_entry_records (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_code VARCHAR(64) NOT NULL,
        student_name VARCHAR(160) NOT NULL,
        student_department VARCHAR(120) NULL,
        student_year VARCHAR(30) NULL,
        entry_date DATE NOT NULL,
        entry_at DATETIME NOT NULL,
        entry_by VARCHAR(120) NOT NULL,
        entry_method ENUM('qr','manual','search') NOT NULL DEFAULT 'manual',
        payment_status ENUM('paid','not_paid') NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_gate_entry_daily (student_code, entry_date),
        INDEX idx_gate_entry_date (entry_date),
        INDEX idx_gate_entry_student (student_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    try {
        $qrPayloadHashColumn = $pdo->query("SHOW COLUMNS FROM gate_entry_records LIKE 'qr_payload_hash'")->fetch();
        if ($qrPayloadHashColumn) {
            $pdo->exec("ALTER TABLE gate_entry_records DROP COLUMN qr_payload_hash");
        }
    } catch (Throwable $error) {
        error_log('staff schema migration warning (drop qr_payload_hash): ' . $error->getMessage());
    }

    try {
        $studentDepartmentColumn = $pdo->query("SHOW COLUMNS FROM gate_entry_records LIKE 'student_department'")->fetch();
        if (!$studentDepartmentColumn) {
            $pdo->exec("ALTER TABLE gate_entry_records ADD COLUMN student_department VARCHAR(120) NULL AFTER student_name");
        }

        $studentYearColumn = $pdo->query("SHOW COLUMNS FROM gate_entry_records LIKE 'student_year'")->fetch();
        if (!$studentYearColumn) {
            $pdo->exec("ALTER TABLE gate_entry_records ADD COLUMN student_year VARCHAR(30) NULL AFTER student_department");
        }

        $paymentStatusColumn = $pdo->query("SHOW COLUMNS FROM gate_entry_records LIKE 'payment_status'")->fetch();
        if (!$paymentStatusColumn) {
            $pdo->exec("ALTER TABLE gate_entry_records ADD COLUMN payment_status ENUM('paid','not_paid') NULL DEFAULT NULL AFTER entry_method");
        }
    } catch (Throwable $error) {
        error_log('staff schema migration warning (gate entry extra columns): ' . $error->getMessage());
    }

    if (staff_table_exists($pdo, 'student_details')) {
        $day1At = $pdo->query("SHOW COLUMNS FROM student_details LIKE 'day1_entry_at'")->fetch();
        if (!$day1At) {
            $pdo->exec("ALTER TABLE student_details ADD COLUMN day1_entry_at DATETIME NULL AFTER gate_pass_created");
        }

        $day1By = $pdo->query("SHOW COLUMNS FROM student_details LIKE 'day1_entry_by'")->fetch();
        if (!$day1By) {
            $pdo->exec("ALTER TABLE student_details ADD COLUMN day1_entry_by VARCHAR(120) NULL AFTER day1_entry_at");
        }

        $day2At = $pdo->query("SHOW COLUMNS FROM student_details LIKE 'day2_entry_at'")->fetch();
        if (!$day2At) {
            $pdo->exec("ALTER TABLE student_details ADD COLUMN day2_entry_at DATETIME NULL AFTER day1_entry_by");
        }

        $day2By = $pdo->query("SHOW COLUMNS FROM student_details LIKE 'day2_entry_by'")->fetch();
        if (!$day2By) {
            $pdo->exec("ALTER TABLE student_details ADD COLUMN day2_entry_by VARCHAR(120) NULL AFTER day2_entry_at");
        }
    }

    try {
        $deptScope = $pdo->query("SHOW COLUMNS FROM event_staff_users LIKE 'department_scope'")->fetch();
        if (!$deptScope) {
            $pdo->exec("ALTER TABLE event_staff_users ADD COLUMN department_scope VARCHAR(120) NULL AFTER role");
        }

        $yearScope = $pdo->query("SHOW COLUMNS FROM event_staff_users LIKE 'year_scope'")->fetch();
        if (!$yearScope) {
            $pdo->exec("ALTER TABLE event_staff_users ADD COLUMN year_scope VARCHAR(30) NULL AFTER department_scope");
        }
    } catch (Throwable $error) {
        error_log('staff schema migration warning (scope columns): ' . $error->getMessage());
    }
}

function gate_entry_timezone(): DateTimeZone
{
    return new DateTimeZone('Asia/Kolkata');
}

function gate_entry_today_utc(): string
{
    $now = new DateTimeImmutable('now', gate_entry_timezone());
    return $now->format('Y-m-d');
}

function gate_entry_now_local(): string
{
    $now = new DateTimeImmutable('now', gate_entry_timezone());
    return $now->format('Y-m-d H:i:s');
}

function get_student_payment_state(PDO $pdo, string $studentCode): array
{
    $submitted = false;
    $approved = false;

    try {
        $stmt = $pdo->prepare('SELECT status, payment_approved
                               FROM payments
                               WHERE UPPER(TRIM(student_code)) = :student_code
                               ORDER BY id DESC
                               LIMIT 1');
        $stmt->execute([':student_code' => strtoupper(trim($studentCode))]);
        $row = $stmt->fetch();

        if ($row) {
            $submitted = true;
            $approval = strtolower(trim((string)($row['payment_approved'] ?? '')));
            $status = strtolower(trim((string)($row['status'] ?? '')));
            $approved = $approval === 'approved' || in_array($status, ['approved', 'completed', 'success'], true);
        }
    } catch (Throwable $error) {
        error_log('get_student_payment_state warning: ' . $error->getMessage());
    }

    return [
        'submitted' => $submitted,
        'approved' => $approved,
    ];
}

function get_gate_eligible_student(PDO $pdo, string $studentCode): ?array
{
    $studentsTable = staff_student_table_name($pdo);

    $sql = sprintf('SELECT student_code,
                                  name,
                                  department,
                                  year,
                                  payment_completion,
                                  payment_approved,
                                  gate_pass_created
                           FROM %s
                           WHERE UPPER(TRIM(student_code)) = :student_code
                           ORDER BY id DESC
                           LIMIT 1', $studentsTable);
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':student_code' => strtoupper(trim($studentCode))]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    $paymentCompletion = (int)($row['payment_completion'] ?? 0) === 1;
    $paymentApproved = strtolower(trim((string)($row['payment_approved'] ?? 'pending'))) === 'approved';
    $paymentState = get_student_payment_state($pdo, $studentCode);
    $paymentSubmitted = $paymentCompletion || $paymentApproved || (bool)($paymentState['submitted'] ?? false);
    $paymentApprovedFinal = $paymentApproved || (bool)($paymentState['approved'] ?? false);
    $gatePassCreated = (int)($row['gate_pass_created'] ?? 0) === 1;

    $isEligible = $paymentSubmitted && $paymentApprovedFinal;
    $reason = '';
    if (!$paymentSubmitted) {
        $reason = 'Contribution payment is not submitted';
    } elseif (!$paymentApprovedFinal) {
        $reason = 'Contribution payment is not approved';
    }

    return [
        'student_code' => strtoupper(trim((string)($row['student_code'] ?? ''))),
        'name' => trim((string)($row['name'] ?? '')),
        'department' => trim((string)($row['department'] ?? '')),
        'year' => trim((string)($row['year'] ?? '')),
        'payment_completion' => $paymentSubmitted,
        'payment_approved' => $paymentApprovedFinal,
        'gate_pass_created' => $gatePassCreated,
        'eligible' => $isEligible,
        'ineligible_reason' => $reason,
    ];
}

/**
 * Get student details for gate entry without eligibility checks
 * Returns student info and payment status regardless of approval status
 */
function get_gate_student(PDO $pdo, string $studentCode): ?array
{
    $studentsTable = staff_student_table_name($pdo);

    $sql = sprintf('SELECT student_code,
                                  name,
                                  department,
                                  year,
                                  payment_completion,
                                  payment_approved,
                                  gate_pass_created
                           FROM %s
                           WHERE UPPER(TRIM(student_code)) = :student_code
                           ORDER BY id DESC
                           LIMIT 1', $studentsTable);
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':student_code' => strtoupper(trim($studentCode))]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    $paymentCompletion = (int)($row['payment_completion'] ?? 0) === 1;
    $paymentApproved = strtolower(trim((string)($row['payment_approved'] ?? 'pending'))) === 'approved';
    $paymentState = get_student_payment_state($pdo, $studentCode);
    $paymentSubmitted = $paymentCompletion || $paymentApproved || (bool)($paymentState['submitted'] ?? false);
    $paymentApprovedFinal = $paymentApproved || (bool)($paymentState['approved'] ?? false);
    $gatePassCreated = (int)($row['gate_pass_created'] ?? 0) === 1;

    // Determine payment status for record
    $isPaid = $paymentApprovedFinal ? 'paid' : 'not_paid';

    return [
        'student_code' => strtoupper(trim((string)($row['student_code'] ?? ''))),
        'name' => trim((string)($row['name'] ?? '')),
        'department' => trim((string)($row['department'] ?? '')),
        'year' => trim((string)($row['year'] ?? '')),
        'payment_completion' => $paymentSubmitted,
        'payment_approved' => $paymentApprovedFinal,
        'gate_pass_created' => $gatePassCreated,
        'payment_status' => $isPaid,
    ];
}

function has_gate_entry_for_date(PDO $pdo, string $studentCode, string $entryDate): ?array
{
        $stmt = $pdo->prepare('SELECT student_code,
                                                                    student_name,
                                                                    student_department,
                                                                    student_year,
                                                                    entry_date,
                                                                    entry_at,
                                                                    entry_by,
                                                                                                                                        entry_method,
                                                                                                                                        payment_status
                           FROM gate_entry_records
                           WHERE student_code = :student_code
                             AND entry_date = :entry_date
                           LIMIT 1');
    $stmt->execute([
        ':student_code' => strtoupper(trim($studentCode)),
        ':entry_date' => $entryDate,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function staff_gate_volunteer_search(): void
{
    $pdo = db();
    get_authenticated_staff($pdo, ['volunteer']);
    $studentsTable = staff_student_table_name($pdo);

    $query = trim((string)($_GET['query'] ?? ''));
    $searchUpper = '%' . strtoupper($query) . '%';
    $compactRaw = preg_replace('/[^A-Za-z0-9]+/', '', $query);
    $compactQuery = strtoupper((string)($compactRaw ?? ''));
    $compactSearch = '%' . $compactQuery . '%';

    if ($query === '') {
        $sql = sprintf('SELECT student_code,
                               name,
                               department,
                               year,
                               payment_completion,
                               payment_approved,
                               gate_pass_created
                        FROM %s
                        WHERE TRIM(COALESCE(student_code, "")) <> ""
                        ORDER BY id DESC', $studentsTable);
    } else {
        $sql = sprintf('SELECT student_code,
                               name,
                               department,
                               year,
                               payment_completion,
                               payment_approved,
                               gate_pass_created
                        FROM %s
                        WHERE TRIM(COALESCE(student_code, "")) <> ""
                          AND (
                              UPPER(COALESCE(name, "")) LIKE :search_upper
                              OR UPPER(COALESCE(student_code, "")) LIKE :search_upper
                              OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(COALESCE(student_code, "")), CHAR(92), ""), "/", ""), " ", ""), "-", ""), "_", "") LIKE :search_compact
                          )
                        ORDER BY id DESC
                        LIMIT 120', $studentsTable);
    }

    try {
        $stmt = $pdo->prepare($sql);
        if ($query === '') {
            $stmt->execute();
        } else {
            $stmt->execute([
                ':search_upper' => $searchUpper,
                ':search_compact' => $compactSearch,
            ]);
        }
        $rows = $stmt->fetchAll();
    } catch (Throwable $error) {
        error_log('staff_gate_volunteer_search error: ' . $error->getMessage());
        json_response([
            'success' => false,
            'message' => 'Unable to search students right now',
        ], 500);
    }

    if (!is_array($rows)) {
        $rows = [];
    }

    $today = gate_entry_today_utc();

    $todayEntryStmt = $pdo->prepare('SELECT student_code,
                                            student_name,
                                            student_department,
                                            student_year,
                                            entry_date,
                                            entry_at,
                                            entry_by,
                                            entry_method
                                     FROM gate_entry_records
                                     WHERE entry_date = :entry_date');
    $todayEntryStmt->execute([':entry_date' => $today]);
    $todayEntryRows = $todayEntryStmt->fetchAll();
    $todayEntryMap = [];
    $paymentStateMap = [];

    if (is_array($todayEntryRows)) {
        foreach ($todayEntryRows as $entryRow) {
            $entryCode = strtoupper(trim((string)($entryRow['student_code'] ?? '')));
            if ($entryCode !== '') {
                $todayEntryMap[$entryCode] = $entryRow;
            }
        }
    }

    try {
        $paymentRowsStmt = $pdo->prepare('SELECT UPPER(TRIM(p.student_code)) AS student_code,
                                                 p.status,
                                                 p.payment_approved
                                          FROM payments p
                                          INNER JOIN (
                                              SELECT MAX(id) AS max_id
                                              FROM payments
                                              WHERE student_code IS NOT NULL
                                                AND TRIM(student_code) <> ""
                                              GROUP BY UPPER(TRIM(student_code))
                                          ) latest ON latest.max_id = p.id');
        $paymentRowsStmt->execute();
        $paymentRows = $paymentRowsStmt->fetchAll();

        if (is_array($paymentRows)) {
            foreach ($paymentRows as $paymentRow) {
                $paymentCode = strtoupper(trim((string)($paymentRow['student_code'] ?? '')));
                if ($paymentCode === '') {
                    continue;
                }

                $approval = strtolower(trim((string)($paymentRow['payment_approved'] ?? '')));
                $status = strtolower(trim((string)($paymentRow['status'] ?? '')));
                $paymentStateMap[$paymentCode] = [
                    'submitted' => true,
                    'approved' => $approval === 'approved' || in_array($status, ['approved', 'completed', 'success'], true),
                ];
            }
        }
    } catch (Throwable $error) {
        error_log('staff_gate_volunteer_search payment map warning: ' . $error->getMessage());
    }

    $latestByCode = [];
    foreach ($rows as $row) {
        $studentCode = strtoupper(trim((string)($row['student_code'] ?? '')));
        if ($studentCode === '') {
            continue;
        }

        if (!isset($latestByCode[$studentCode])) {
            $latestByCode[$studentCode] = $row;
        }
    }

    $students = [];
    foreach ($latestByCode as $studentCode => $row) {
        $paymentCompletion = (int)($row['payment_completion'] ?? 0) === 1;
        $paymentApproved = strtolower(trim((string)($row['payment_approved'] ?? 'pending'))) === 'approved';
        $paymentState = $paymentStateMap[$studentCode] ?? ['submitted' => false, 'approved' => false];
        $paymentSubmitted = $paymentCompletion || $paymentApproved || (bool)($paymentState['submitted'] ?? false);
        $paymentApprovedFinal = $paymentApproved || (bool)($paymentState['approved'] ?? false);
        $gatePassCreated = (int)($row['gate_pass_created'] ?? 0) === 1;

        $isEligible = true;
        $reason = '';

        $todayEntry = $todayEntryMap[$studentCode] ?? null;

        $students[] = [
            'student_code' => $studentCode,
            'name' => trim((string)($row['name'] ?? '')),
            'department' => trim((string)($row['department'] ?? '')),
            'year' => trim((string)($row['year'] ?? '')),
            'eligible' => $isEligible,
            'ineligible_reason' => $reason,
            'payment_status' => $paymentApprovedFinal ? 'paid' : 'not_paid',
            'entered_today' => $todayEntry !== null,
            'today_entry' => $todayEntry,
        ];
    }

    usort($students, static function (array $a, array $b): int {
        $aName = strtolower(trim((string)($a['name'] ?? '')));
        $bName = strtolower(trim((string)($b['name'] ?? '')));
        if ($aName === $bName) {
            return strcmp((string)($a['student_code'] ?? ''), (string)($b['student_code'] ?? ''));
        }
        return strcmp($aName, $bName);
    });

    json_response([
        'success' => true,
        'students' => $students,
        'entry_date' => $today,
    ]);
}

function staff_gate_volunteer_entries(): void
{
    $pdo = db();
    get_authenticated_staff($pdo, ['volunteer']);

    $allRecords = in_array(strtolower(trim((string)($_GET['all'] ?? '0'))), ['1', 'true', 'yes'], true);
    $entryDate = trim((string)($_GET['entry_date'] ?? gate_entry_today_utc()));
    if (!$allRecords && preg_match('/^\d{4}-\d{2}-\d{2}$/', $entryDate) !== 1) {
        json_response(['success' => false, 'message' => 'entry_date must be YYYY-MM-DD'], 422);
    }

    $limit = (int)($_GET['limit'] ?? 100);
    $limit = max(1, min(50000, $limit));

    if ($allRecords) {
        $stmt = $pdo->prepare('SELECT id,
                                      student_code,
                                      student_name,
                                      student_department,
                                      student_year,
                                      entry_date,
                                      entry_at,
                                      entry_by,
                                      entry_method,
                                      payment_status
                               FROM gate_entry_records
                               ORDER BY entry_date DESC, entry_at DESC
                               LIMIT :limit');
    } else {
        $stmt = $pdo->prepare('SELECT id,
                                      student_code,
                                      student_name,
                                      student_department,
                                      student_year,
                                      entry_date,
                                      entry_at,
                                      entry_by,
                                      entry_method,
                                      payment_status
                               FROM gate_entry_records
                               WHERE entry_date = :entry_date
                               ORDER BY entry_at DESC
                               LIMIT :limit');
        $stmt->bindValue(':entry_date', $entryDate, PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    json_response([
        'success' => true,
        'entry_date' => $allRecords ? null : $entryDate,
        'all' => $allRecords,
        'records' => is_array($rows) ? $rows : [],
    ]);
}

function staff_gate_volunteer_mark_entry(): void
{
    $payload = get_json_input();

    $pdo = db();
    $staff = get_authenticated_staff($pdo, ['volunteer']);

    $studentCode = parse_staff_student_code($payload['student_code'] ?? null, $payload['qr_data'] ?? null);
    if ($studentCode === '') {
        json_response(['success' => false, 'message' => 'student_code or qr_data is required'], 422);
    }

    $entryMethod = strtolower(trim((string)($payload['entry_method'] ?? 'manual')));
    if (!in_array($entryMethod, ['qr', 'manual', 'search'], true)) {
        $entryMethod = 'manual';
    }

    $student = get_gate_student($pdo, $studentCode);
    if (!$student) {
        json_response(['success' => false, 'message' => 'Student not found'], 404);
        return;
    }

    // Entry is now allowed regardless of payment status - just verify student exists

    $entryDate = gate_entry_today_utc();
    $existing = has_gate_entry_for_date($pdo, $studentCode, $entryDate);
    if ($existing !== null) {
        json_response([
            'success' => false,
            'message' => 'Entry already marked today for this student',
            'entry' => $existing,
        ], 409);
    }

    $entryAt = gate_entry_now_local();

    $insert = $pdo->prepare('INSERT INTO gate_entry_records (
                                student_code,
                                student_name,
                                          student_department,
                                          student_year,
                                entry_date,
                                entry_at,
                                entry_by,
                                entry_method,
                                payment_status
                             ) VALUES (
                                :student_code,
                                :student_name,
                                          :student_department,
                                          :student_year,
                                :entry_date,
                                :entry_at,
                                :entry_by,
                                :entry_method,
                                :payment_status
                             )');

    try {
        $insert->execute([
            ':student_code' => $studentCode,
            ':student_name' => (string)$student['name'],
            ':student_department' => (string)$student['department'],
            ':student_year' => (string)$student['year'],
            ':entry_date' => $entryDate,
            ':entry_at' => $entryAt,
            ':entry_by' => (string)($staff['username'] ?? 'volunteer'),
            ':entry_method' => $entryMethod,
            ':payment_status' => (string)($student['payment_status'] ?? 'not_paid'),
        ]);
    } catch (Throwable $error) {
        if ((string)$error->getCode() === '23000') {
            $conflict = has_gate_entry_for_date($pdo, $studentCode, $entryDate);
            json_response([
                'success' => false,
                'message' => 'Entry already marked today for this student',
                'entry' => $conflict,
            ], 409);
        }

        json_response([
            'success' => false,
            'message' => 'Unable to store gate entry record',
            'error' => $error->getMessage(),
        ], 500);
    }

    json_response([
        'success' => true,
        'message' => 'Entry granted',
        'entry' => [
            'student_code' => $studentCode,
            'student_name' => (string)$student['name'],
            'student_department' => (string)$student['department'],
            'student_year' => (string)$student['year'],
            'entry_date' => $entryDate,
            'entry_at' => $entryAt,
            'entry_by' => (string)($staff['username'] ?? 'volunteer'),
            'entry_method' => $entryMethod,
            'payment_status' => (string)($student['payment_status'] ?? 'not_paid'),
        ],
    ]);
}

function staff_gate_volunteer_resolve_student(): void
{
    $payload = get_json_input();

    $pdo = db();
    get_authenticated_staff($pdo, ['volunteer']);

    $studentCode = parse_staff_student_code($payload['student_code'] ?? null, $payload['qr_data'] ?? null);
    if ($studentCode === '') {
        json_response(['success' => false, 'message' => 'student_code or qr_data is required'], 422);
    }

    $student = get_gate_student($pdo, $studentCode);
    if (!$student) {
        json_response(['success' => false, 'message' => 'Student not found'], 404);
    }

    $entryDate = gate_entry_today_utc();
    $existing = has_gate_entry_for_date($pdo, $studentCode, $entryDate);

    json_response([
        'success' => true,
        'entry_date' => $entryDate,
        'student' => [
            'student_code' => (string)$student['student_code'],
            'name' => (string)$student['name'],
            'department' => (string)$student['department'],
            'year' => (string)$student['year'],
            'payment_completion' => (bool)$student['payment_completion'],
            'payment_approved' => (bool)$student['payment_approved'],
            'payment_status' => (string)$student['payment_status'],
            'gate_pass_created' => (bool)$student['gate_pass_created'],
        ],
        'entered_today' => $existing !== null,
        'today_entry' => $existing,
    ]);
}

function extract_bearer_token(): string
{
    $authHeader = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if ($authHeader === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authHeader = (string)($headers['Authorization'] ?? $headers['authorization'] ?? '');
    }

    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches) === 1) {
        return trim((string)$matches[1]);
    }

    return '';
}

function parse_staff_student_code(?string $studentCode, ?string $qrData): string
{
    $code = strtoupper(trim((string)$studentCode));
    if ($code !== '') {
        return $code;
    }

    $rawQr = trim((string)$qrData);
    if ($rawQr === '') {
        return '';
    }

    $decoded = json_decode($rawQr, true);
    if (is_array($decoded)) {
        $candidates = [
            $decoded['Student_Code'] ?? null,
            $decoded['student_code'] ?? null,
            $decoded['studentId'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            $normalized = strtoupper(trim((string)$candidate));
            if ($normalized !== '') {
                return $normalized;
            }
        }
    }

    return strtoupper($rawQr);
}

function normalize_scope_text(string $value): string
{
    return strtoupper(trim($value));
}

function extract_student_code_parts(string $studentCode): array
{
    $raw = trim($studentCode);
    if ($raw === '') {
        return [
            'admission_year' => null,
            'department' => '',
        ];
    }

    $parts = preg_split('/[\\\/\-_\s]+/', $raw);
    if (!is_array($parts)) {
        $parts = [];
    }

    $admissionYear = null;
    $department = '';

    foreach ($parts as $index => $part) {
        $segment = trim((string)$part);
        if ($segment === '') {
            continue;
        }

        if ($admissionYear === null && preg_match('/^(19|20)\d{2}$/', $segment) === 1) {
            $admissionYear = (int)$segment;

            $nextSegment = trim((string)($parts[$index + 1] ?? ''));
            if ($nextSegment !== '' && preg_match('/^[A-Za-z][A-Za-z0-9\- ]*$/', $nextSegment) === 1) {
                $department = $nextSegment;
            }
        }
    }

    if ($admissionYear === null) {
        if (preg_match('/((?:19|20)\d{2})/', $raw, $yearMatch) === 1) {
            $candidateYear = (int)$yearMatch[1];
            $maxReasonableYear = (int)gmdate('Y') + 1;
            if ($candidateYear >= 1990 && $candidateYear <= $maxReasonableYear) {
                $admissionYear = $candidateYear;
            }
        }
    }

    if ($admissionYear === null) {
        if (preg_match('/^\D*(\d{2})[A-Za-z]/', $raw, $shortYearMatch) === 1) {
            $yy = (int)$shortYearMatch[1];
            $currentYear = (int)gmdate('Y');
            $candidateYear = 2000 + $yy;

            if ($candidateYear > ($currentYear + 1)) {
                $candidateYear -= 100;
            }

            if ($candidateYear >= 1990 && $candidateYear <= ($currentYear + 1)) {
                $admissionYear = $candidateYear;
            }
        }
    }

    if ($department === '') {
        if (preg_match('/(?:19|20)\d{2}\s*[-_\/]?\s*([A-Za-z]{2,12})/', $raw, $deptMatch) === 1) {
            $department = $deptMatch[1];
        } elseif (preg_match('/^\D*\d{2}\s*[-_\/]?\s*([A-Za-z]{2,12})/', $raw, $deptMatch) === 1) {
            $department = $deptMatch[1];
        }
    }

    if ($department === '') {
        foreach ($parts as $segment) {
            $token = trim((string)$segment);
            if ($token !== '' && preg_match('/^[A-Za-z]{2,10}$/', $token) === 1 && preg_match('/^(19|20)\d{2}$/', $token) !== 1) {
                $department = $token;
                break;
            }
        }
    }

    return [
        'admission_year' => $admissionYear,
        'department' => $department,
    ];
}

function infer_year_label_from_student_code(string $studentCode, ?int $referenceYear = null): string
{
    $parts = extract_student_code_parts($studentCode);
    $admissionYear = isset($parts['admission_year']) ? (int)$parts['admission_year'] : 0;
    if ($admissionYear <= 0) {
        return '';
    }

    $currentYear = $referenceYear ?: (int)gmdate('Y');
    $delta = $currentYear - $admissionYear;

    if ($delta <= 0) {
        $yearNumber = 1;
    } else {
        $yearNumber = min(6, $delta);
    }

    if ($yearNumber === 1) return '1st Year';
    if ($yearNumber === 2) return '2nd Year';
    if ($yearNumber === 3) return '3rd Year';
    return $yearNumber . 'th Year';
}

function infer_year_number_from_student_code(string $studentCode, ?int $referenceYear = null): int
{
    $parts = extract_student_code_parts($studentCode);
    $admissionYear = isset($parts['admission_year']) ? (int)$parts['admission_year'] : 0;
    if ($admissionYear <= 0) {
        return 0;
    }

    $currentYear = $referenceYear ?: (int)gmdate('Y');
    $delta = $currentYear - $admissionYear;

    if ($delta <= 0) {
        return 1;
    }

    return min(6, $delta);
}

function infer_admission_year_from_student_code(string $studentCode): int
{
    $parts = extract_student_code_parts($studentCode);
    $admissionYear = isset($parts['admission_year']) ? (int)$parts['admission_year'] : 0;
    return $admissionYear > 0 ? $admissionYear : 0;
}

function normalize_year_number(string $value): int
{
    $normalized = strtoupper(trim($value));
    if ($normalized === '') {
        return 0;
    }

    if (preg_match('/\b([1-9])\b/', $normalized, $m) === 1) {
        return (int)$m[1];
    }

    if (preg_match('/\b([1-9])(ST|ND|RD|TH)\b/', $normalized, $m) === 1) {
        return (int)$m[1];
    }

    if (strpos($normalized, 'FIRST') !== false) return 1;
    if (strpos($normalized, 'SECOND') !== false) return 2;
    if (strpos($normalized, 'THIRD') !== false) return 3;
    if (strpos($normalized, 'FOURTH') !== false) return 4;
    if (strpos($normalized, 'FIFTH') !== false) return 5;
    if (strpos($normalized, 'SIXTH') !== false) return 6;

    return 0;
}

function row_matches_cr_scope(array $row, string $departmentScope, string $yearScope): bool
{
    $studentCode = trim((string)($row['student_code'] ?? ''));

    $scopeDepartmentNormalized = normalize_scope_text($departmentScope);
    $scopeYearNumber = normalize_year_number($yearScope);

    $rowDepartment = trim((string)($row['department'] ?? ''));
    $rowYear = trim((string)($row['year'] ?? ''));

    $derived = extract_student_code_parts($studentCode);
    $derivedDepartment = trim((string)($derived['department'] ?? ''));
    $derivedYearLabel = infer_year_label_from_student_code($studentCode);
    $derivedYearNumber = infer_year_number_from_student_code($studentCode);

    $effectiveDepartment = $derivedDepartment !== '' ? $derivedDepartment : $rowDepartment;
    $effectiveYear = $derivedYearLabel !== '' ? $derivedYearLabel : $rowYear;

    $departmentMatches = normalize_scope_text($effectiveDepartment) === $scopeDepartmentNormalized;

    $rowYearNumber = normalize_year_number($rowYear);
    $effectiveYearNumber = $derivedYearNumber > 0
        ? $derivedYearNumber
        : ($rowYearNumber > 0 ? $rowYearNumber : normalize_year_number($effectiveYear));
    $yearMatches = $scopeYearNumber > 0
        ? $effectiveYearNumber === $scopeYearNumber
        : true;

    return $departmentMatches && $yearMatches;
}

function get_authenticated_staff(PDO $pdo, array $allowedRoles = []): array
{
    ensure_staff_schema($pdo);

    $hasScopeColumns = staff_scope_columns_available($pdo);

    $token = extract_bearer_token();
    if ($token === '') {
        json_response(['success' => false, 'message' => 'Unauthorized: missing token'], 401);
    }

    if ($hasScopeColumns) {
        $stmt = $pdo->prepare('SELECT id, full_name, username, role, department_scope, year_scope, is_active, token_expires_at
                               FROM event_staff_users
                               WHERE auth_token = :auth_token
                               LIMIT 1');
    } else {
        $stmt = $pdo->prepare("SELECT id, full_name, username, role, '' AS department_scope, '' AS year_scope, is_active, token_expires_at
                               FROM event_staff_users
                               WHERE auth_token = :auth_token
                               LIMIT 1");
    }
    $stmt->execute([':auth_token' => $token]);
    $staff = $stmt->fetch();

    if (!$staff || (int)$staff['is_active'] !== 1) {
        json_response(['success' => false, 'message' => 'Unauthorized: invalid token'], 401);
    }

    $expiresAt = trim((string)($staff['token_expires_at'] ?? ''));
    if ($expiresAt === '' || strtotime($expiresAt) < time()) {
        json_response(['success' => false, 'message' => 'Unauthorized: token expired'], 401);
    }

    $staffRole = strtolower(trim((string)$staff['role']));
    if ($allowedRoles && !in_array($staffRole, $allowedRoles, true)) {
        json_response(['success' => false, 'message' => 'Forbidden: insufficient role'], 403);
    }

    return $staff;
}

function require_super_admin_for_staff_create(PDO $pdo, array $payload): array
{
    require_fields($payload, ['super_admin_username', 'super_admin_password']);

    $identity = strtolower(trim((string)$payload['super_admin_username']));
    $password = (string)$payload['super_admin_password'];

    if ($identity === '' || $password === '') {
        json_response(['success' => false, 'message' => 'Super admin credentials are required'], 422);
    }

     $stmt = $pdo->prepare('SELECT id, username, email, full_name, password, is_active
                                    FROM super_admin_credentials
                                    WHERE LOWER(username) = :identity_username
                                        OR LOWER(email) = :identity_email
                                    LIMIT 1');
     $stmt->execute([
          ':identity_username' => $identity,
          ':identity_email' => $identity,
     ]);
    $superAdmin = $stmt->fetch();

    if (!$superAdmin || (int)($superAdmin['is_active'] ?? 0) !== 1) {
        json_response(['success' => false, 'message' => 'Only super admin can create staff accounts'], 403);
    }

    $storedPassword = (string)($superAdmin['password'] ?? '');
    $isValid = false;
    if (function_exists('verify_super_admin_password')) {
        $isValid = verify_super_admin_password($password, $storedPassword);
    } else {
        $isValid = password_verify($password, $storedPassword) || hash_equals(trim($storedPassword), $password);
    }

    if (!$isValid) {
        json_response(['success' => false, 'message' => 'Only super admin can create staff accounts'], 403);
    }

    return $superAdmin;
}

function staff_create(): void
{
    $payload = get_json_input();
    require_fields($payload, ['name', 'username', 'password', 'role']);

    $name = trim((string)$payload['name']);
    $username = strtolower(trim((string)$payload['username']));
    $password = (string)$payload['password'];
    $role = strtolower(trim((string)$payload['role']));
    $departmentScope = trim((string)($payload['department_scope'] ?? ''));
    $yearScope = trim((string)($payload['year_scope'] ?? ''));

    if (!in_array($role, ['cr', 'volunteer'], true)) {
        json_response(['success' => false, 'message' => 'role must be cr or volunteer'], 422);
    }
    if ($name === '' || $username === '') {
        json_response(['success' => false, 'message' => 'name and username cannot be empty'], 422);
    }
    if (strlen($password) < 6) {
        json_response(['success' => false, 'message' => 'Password must be at least 6 characters'], 422);
    }

    if ($role === 'cr' && ($departmentScope === '' || $yearScope === '')) {
        json_response(['success' => false, 'message' => 'department_scope and year_scope are required for CR'], 422);
    }

    if ($role === 'volunteer') {
        $departmentScope = '';
        $yearScope = '';
    }

    $pdo = db();
    ensure_staff_schema($pdo);
    $superAdmin = require_super_admin_for_staff_create($pdo, $payload);

    $hasScopeColumns = staff_scope_columns_available($pdo);

    if ($role === 'cr' && !$hasScopeColumns) {
        json_response([
            'success' => false,
            'message' => 'Database migration required: add department_scope and year_scope columns to event_staff_users before creating CR accounts.'
        ], 500);
    }

    if ($hasScopeColumns) {
        $stmt = $pdo->prepare('INSERT INTO event_staff_users (full_name, username, password_hash, role, department_scope, year_scope, is_active)
                               VALUES (:full_name, :username, :password_hash, :role, :department_scope, :year_scope, 1)');
    } else {
        $stmt = $pdo->prepare('INSERT INTO event_staff_users (full_name, username, password_hash, role, is_active)
                               VALUES (:full_name, :username, :password_hash, :role, 1)');
    }

    try {
        $params = [
            ':full_name' => $name,
            ':username' => $username,
            ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
            ':role' => $role,
        ];

        if ($hasScopeColumns) {
            $params[':department_scope'] = $departmentScope !== '' ? $departmentScope : null;
            $params[':year_scope'] = $yearScope !== '' ? $yearScope : null;
        }

        $stmt->execute($params);
    } catch (Throwable $error) {
        if ((string)$error->getCode() === '23000') {
            json_response(['success' => false, 'message' => 'Username already exists'], 409);
        }
        json_response([
            'success' => false,
            'message' => 'Unable to create staff account: ' . $error->getMessage(),
        ], 500);
    }

    log_event('staff_create', 'event_staff_user', (string)$pdo->lastInsertId(), [
        'username' => $username,
        'role' => $role,
        'department_scope' => $departmentScope,
        'year_scope' => $yearScope,
    ], (string)($superAdmin['username'] ?? 'superadmin'));

    json_response(['success' => true, 'message' => 'Staff account created'], 201);
}

function staff_list(): void
{
    $payload = get_json_input();

    $pdo = db();
    ensure_staff_schema($pdo);
    require_super_admin_for_staff_create($pdo, $payload);

    $hasScopeColumns = staff_scope_columns_available($pdo);

    if ($hasScopeColumns) {
        $stmt = $pdo->prepare('SELECT id,
                                      full_name,
                                      username,
                                      role,
                                      department_scope,
                                      year_scope,
                                      is_active,
                                      created_at,
                                      updated_at
                               FROM event_staff_users
                               ORDER BY created_at DESC, id DESC');
    } else {
        $stmt = $pdo->prepare("SELECT id,
                                      full_name,
                                      username,
                                      role,
                                      '' AS department_scope,
                                      '' AS year_scope,
                                      is_active,
                                      created_at,
                                      updated_at
                               FROM event_staff_users
                               ORDER BY created_at DESC, id DESC");
    }

    $stmt->execute();
    $rows = $stmt->fetchAll();

    $accounts = array_map(static function (array $row): array {
        return [
            'id' => (int)($row['id'] ?? 0),
            'name' => (string)($row['full_name'] ?? ''),
            'username' => (string)($row['username'] ?? ''),
            'role' => (string)($row['role'] ?? ''),
            'department_scope' => (string)($row['department_scope'] ?? ''),
            'year_scope' => (string)($row['year_scope'] ?? ''),
            'is_active' => (int)($row['is_active'] ?? 0),
            'created_at' => (string)($row['created_at'] ?? ''),
            'updated_at' => (string)($row['updated_at'] ?? ''),
        ];
    }, is_array($rows) ? $rows : []);

    json_response([
        'success' => true,
        'accounts' => $accounts,
    ]);
}

function staff_update(): void
{
    $payload = get_json_input();
    require_fields($payload, ['staff_id']);

    $staffId = (int)($payload['staff_id'] ?? 0);
    if ($staffId <= 0) {
        json_response(['success' => false, 'message' => 'Valid staff_id is required'], 422);
    }

    $pdo = db();
    ensure_staff_schema($pdo);
    $superAdmin = require_super_admin_for_staff_create($pdo, $payload);

    $hasScopeColumns = staff_scope_columns_available($pdo);

    if ($hasScopeColumns) {
        $find = $pdo->prepare('SELECT id, full_name, username, role, department_scope, year_scope, is_active
                               FROM event_staff_users
                               WHERE id = :id
                               LIMIT 1');
    } else {
        $find = $pdo->prepare("SELECT id, full_name, username, role, '' AS department_scope, '' AS year_scope, is_active
                               FROM event_staff_users
                               WHERE id = :id
                               LIMIT 1");
    }
    $find->execute([':id' => $staffId]);
    $existing = $find->fetch();

    if (!$existing) {
        json_response(['success' => false, 'message' => 'Staff account not found'], 404);
    }

    $nextName = array_key_exists('name', $payload)
        ? trim((string)$payload['name'])
        : (string)($existing['full_name'] ?? '');
    $nextUsername = array_key_exists('username', $payload)
        ? strtolower(trim((string)$payload['username']))
        : strtolower((string)($existing['username'] ?? ''));
    $nextRole = array_key_exists('role', $payload)
        ? strtolower(trim((string)$payload['role']))
        : strtolower((string)($existing['role'] ?? ''));
    $nextIsActive = array_key_exists('is_active', $payload)
        ? ((int)$payload['is_active'] === 1 ? 1 : 0)
        : (int)($existing['is_active'] ?? 1);

    if (!in_array($nextRole, ['cr', 'volunteer'], true)) {
        json_response(['success' => false, 'message' => 'role must be cr or volunteer'], 422);
    }

    if ($nextName === '' || $nextUsername === '') {
        json_response(['success' => false, 'message' => 'name and username cannot be empty'], 422);
    }

    $nextDepartmentScope = array_key_exists('department_scope', $payload)
        ? trim((string)$payload['department_scope'])
        : trim((string)($existing['department_scope'] ?? ''));
    $nextYearScope = array_key_exists('year_scope', $payload)
        ? trim((string)$payload['year_scope'])
        : trim((string)($existing['year_scope'] ?? ''));

    if ($nextRole === 'volunteer') {
        $nextDepartmentScope = '';
        $nextYearScope = '';
    }

    if ($nextRole === 'cr' && ($nextDepartmentScope === '' || $nextYearScope === '')) {
        json_response(['success' => false, 'message' => 'department_scope and year_scope are required for CR'], 422);
    }

    if ($nextRole === 'cr' && !$hasScopeColumns) {
        json_response([
            'success' => false,
            'message' => 'Database migration required: add department_scope and year_scope columns before assigning CR scope.'
        ], 500);
    }

    $password = array_key_exists('password', $payload)
        ? trim((string)$payload['password'])
        : '';
    if ($password !== '' && strlen($password) < 6) {
        json_response(['success' => false, 'message' => 'Password must be at least 6 characters'], 422);
    }

    $sqlParts = [
        'full_name = :full_name',
        'username = :username',
        'role = :role',
        'is_active = :is_active',
    ];
    $params = [
        ':full_name' => $nextName,
        ':username' => $nextUsername,
        ':role' => $nextRole,
        ':is_active' => $nextIsActive,
        ':id' => $staffId,
    ];

    if ($hasScopeColumns) {
        $sqlParts[] = 'department_scope = :department_scope';
        $sqlParts[] = 'year_scope = :year_scope';
        $params[':department_scope'] = $nextDepartmentScope !== '' ? $nextDepartmentScope : null;
        $params[':year_scope'] = $nextYearScope !== '' ? $nextYearScope : null;
    }

    if ($password !== '') {
        $sqlParts[] = 'password_hash = :password_hash';
        $params[':password_hash'] = password_hash($password, PASSWORD_BCRYPT);
    }

    $updateSql = 'UPDATE event_staff_users SET ' . implode(', ', $sqlParts) . ' WHERE id = :id LIMIT 1';
    $updateStmt = $pdo->prepare($updateSql);

    try {
        $updateStmt->execute($params);
    } catch (Throwable $error) {
        if ((string)$error->getCode() === '23000') {
            json_response(['success' => false, 'message' => 'Username already exists'], 409);
        }

        json_response([
            'success' => false,
            'message' => 'Unable to update staff account: ' . $error->getMessage(),
        ], 500);
    }

    log_event('staff_update', 'event_staff_user', (string)$staffId, [
        'name' => $nextName,
        'username' => $nextUsername,
        'role' => $nextRole,
        'department_scope' => $nextDepartmentScope,
        'year_scope' => $nextYearScope,
        'is_active' => $nextIsActive,
        'password_changed' => $password !== '',
    ], (string)($superAdmin['username'] ?? 'superadmin'));

    json_response([
        'success' => true,
        'message' => 'Staff account updated successfully',
    ]);
}

function staff_login(): void
{
    $payload = get_json_input();
    require_fields($payload, ['username', 'password']);

    $username = strtolower(trim((string)$payload['username']));
    $password = (string)$payload['password'];
    if ($username === '' || $password === '') {
        json_response(['success' => false, 'message' => 'username and password are required'], 422);
    }

    $pdo = db();
    ensure_staff_schema($pdo);

    $hasScopeColumns = staff_scope_columns_available($pdo);

    if ($hasScopeColumns) {
        $stmt = $pdo->prepare('SELECT id, full_name, username, password_hash, role, department_scope, year_scope, is_active
                               FROM event_staff_users
                               WHERE LOWER(username) = :username
                               LIMIT 1');
    } else {
        $stmt = $pdo->prepare("SELECT id, full_name, username, password_hash, role, '' AS department_scope, '' AS year_scope, is_active
                               FROM event_staff_users
                               WHERE LOWER(username) = :username
                               LIMIT 1");
    }
    $stmt->execute([':username' => $username]);
    $staff = $stmt->fetch();

    if (!$staff || (int)$staff['is_active'] !== 1 || !password_verify($password, (string)$staff['password_hash'])) {
        json_response(['success' => false, 'message' => 'Invalid credentials'], 401);
    }

    $token = bin2hex(random_bytes(24));
    $expiresAt = gmdate('Y-m-d H:i:s', time() + (12 * 60 * 60));

    $update = $pdo->prepare('UPDATE event_staff_users
                             SET auth_token = :auth_token,
                                 token_expires_at = :token_expires_at
                             WHERE id = :id');
    $update->execute([
        ':auth_token' => $token,
        ':token_expires_at' => $expiresAt,
        ':id' => (int)$staff['id'],
    ]);

    json_response([
        'success' => true,
        'staff' => [
            'id' => (int)$staff['id'],
            'name' => (string)$staff['full_name'],
            'username' => (string)$staff['username'],
            'role' => (string)$staff['role'],
            'department_scope' => (string)($staff['department_scope'] ?? ''),
            'year_scope' => (string)($staff['year_scope'] ?? ''),
        ],
        'token' => $token,
        'expires_at' => $expiresAt,
    ]);
}

function staff_logout(): void
{
    $pdo = db();
    $staff = get_authenticated_staff($pdo, ['cr', 'volunteer']);

    $stmt = $pdo->prepare('UPDATE event_staff_users
                           SET auth_token = NULL,
                               token_expires_at = NULL
                           WHERE id = :id');
    $stmt->execute([':id' => (int)$staff['id']]);

    json_response(['success' => true, 'message' => 'Logged out']);
}

function staff_transactions(): void
{
    $pdo = db();
    $staff = get_authenticated_staff($pdo, ['cr', 'volunteer']);

    $staffRole = strtolower(trim((string)($staff['role'] ?? '')));
    $departmentScope = trim((string)($staff['department_scope'] ?? ''));
    $yearScope = trim((string)($staff['year_scope'] ?? ''));

    $studentsSql = 'SELECT student_code,
                           name,
                           phone,
                           department,
                           year,
                           payment_completion,
                           payment_approved,
                           updated_at,
                           id
                    FROM student_details
                    WHERE TRIM(COALESCE(student_code, "")) <> ""';
    $studentsParams = [];

    if ($staffRole === 'cr') {
        if ($departmentScope === '' || $yearScope === '') {
            json_response(['success' => false, 'message' => 'CR scope is not configured'], 403);
        }

        $scopeDepartmentUpper = normalize_scope_text($departmentScope);
        $studentsSql .= ' AND (UPPER(TRIM(department)) = :department_scope OR department IS NULL OR TRIM(department) = "")';
        $studentsParams[':department_scope'] = $scopeDepartmentUpper;
    }

    $studentsSql .= ' ORDER BY updated_at DESC, id DESC LIMIT 5000';
    $studentsStmt = $pdo->prepare($studentsSql);
    foreach ($studentsParams as $key => $value) {
        $studentsStmt->bindValue($key, $value, PDO::PARAM_STR);
    }
    $studentsStmt->execute();
    $students = $studentsStmt->fetchAll();
    if (!is_array($students)) {
        $students = [];
    }

    if ($staffRole === 'cr') {
        $students = array_values(array_filter($students, static function (array $row) use ($departmentScope, $yearScope): bool {
            return row_matches_cr_scope([
                'student_code' => (string)($row['student_code'] ?? ''),
                'department' => (string)($row['department'] ?? ''),
                'year' => (string)($row['year'] ?? ''),
            ], $departmentScope, $yearScope);
        }));
    }

    $scopedStudentCodeSet = [];
    foreach ($students as $studentRow) {
        $code = strtoupper(trim((string)($studentRow['student_code'] ?? '')));
        if ($code !== '') {
            $scopedStudentCodeSet[$code] = true;
        }
    }

    $paidCodesStmt = $pdo->prepare('SELECT DISTINCT UPPER(TRIM(student_code)) AS student_code
                                    FROM payments
                                    WHERE student_code IS NOT NULL
                                      AND TRIM(student_code) <> ""');
    $paidCodesStmt->execute();
    $paidCodeRows = $paidCodesStmt->fetchAll();

    $paidCodeSet = [];
    if (is_array($paidCodeRows)) {
        foreach ($paidCodeRows as $paidRow) {
            $paidCode = strtoupper(trim((string)($paidRow['student_code'] ?? '')));
            if ($paidCode !== '') {
                $paidCodeSet[$paidCode] = true;
            }
        }
    }

    $pendingStudents = array_values(array_filter($students, static function (array $row) use ($paidCodeSet): bool {
        $code = strtoupper(trim((string)($row['student_code'] ?? '')));
        if ($code === '') {
            return false;
        }
        return !isset($paidCodeSet[$code]);
    }));

    $paymentsSql = 'SELECT p.payment_id,
                           p.transaction_id,
                           p.utr_no,
                           p.student_code,
                           p.student_name,
                           p.department,
                           p.year,
                           p.amount,
                           p.status,
                           p.payment_approved,
                           p.created_at,
                           COALESCE(sd.phone, "") AS phone
                    FROM payments p
                    LEFT JOIN student_details sd ON UPPER(TRIM(sd.student_code)) = UPPER(TRIM(p.student_code))
                    ORDER BY p.id DESC
                    LIMIT 5000';
    $paymentsStmt = $pdo->prepare($paymentsSql);
    $paymentsStmt->execute();
    $payments = $paymentsStmt->fetchAll();
    if (!is_array($payments)) {
        $payments = [];
    }

    $payments = array_values(array_filter($payments, static function (array $row) use ($scopedStudentCodeSet): bool {
        $code = strtoupper(trim((string)($row['student_code'] ?? '')));
        if ($code === '') {
            return false;
        }
        return isset($scopedStudentCodeSet[$code]);
    }));

    $payments = array_map(static function (array $row): array {
        $studentCode = trim((string)($row['student_code'] ?? ''));
        $inferredYear = infer_year_label_from_student_code($studentCode);
        $inferredAdmissionYear = infer_admission_year_from_student_code($studentCode);
        if (trim((string)($row['year'] ?? '')) === '') {
            $row['year'] = $inferredYear;
        }
        if (trim((string)($row['department'] ?? '')) === '') {
            $parts = extract_student_code_parts($studentCode);
            $row['department'] = trim((string)($parts['department'] ?? ''));
        }
        $row['inferred_year'] = $inferredYear;
        $row['admission_year'] = $inferredAdmissionYear;
        return $row;
    }, $payments);

    $pendingStudents = array_map(static function (array $row): array {
        $studentCode = trim((string)($row['student_code'] ?? ''));
        $inferredYear = infer_year_label_from_student_code($studentCode);
        $inferredAdmissionYear = infer_admission_year_from_student_code($studentCode);
        if (trim((string)($row['year'] ?? '')) === '') {
            $row['year'] = $inferredYear;
        }
        if (trim((string)($row['department'] ?? '')) === '') {
            $parts = extract_student_code_parts($studentCode);
            $row['department'] = trim((string)($parts['department'] ?? ''));
        }
        $row['inferred_year'] = $inferredYear;
        $row['admission_year'] = $inferredAdmissionYear;
        return $row;
    }, $pendingStudents);

    $paidCount = 0;
    foreach ($payments as $payment) {
        $isPaid = in_array(strtolower((string)($payment['status'] ?? '')), ['pending', 'completed', 'declined'], true);
        if ($isPaid) {
            $paidCount++;
        }
    }

    json_response([
        'success' => true,
        'viewer_role' => $staff['role'],
        'access_scope' => [
            'department' => $departmentScope,
            'year' => $yearScope,
        ],
        'summary' => [
            'submitted_payments' => count($payments),
            'pending_payment_students' => count($pendingStudents),
            'paid_count' => $paidCount,
        ],
        'transactions' => $payments,
        'pending_list' => $pendingStudents,
    ]);
}

function staff_mark_gate_entry(): void
{
    $payload = get_json_input();
    require_fields($payload, ['day']);

    $pdo = db();
    $staff = get_authenticated_staff($pdo, ['volunteer']);

    $day = strtolower(trim((string)$payload['day']));
    if (!in_array($day, ['day1', 'day2'], true)) {
        json_response(['success' => false, 'message' => 'day must be day1 or day2'], 422);
    }

    $studentCode = parse_staff_student_code($payload['student_code'] ?? null, $payload['qr_data'] ?? null);
    if ($studentCode === '') {
        json_response(['success' => false, 'message' => 'student_code or qr_data is required'], 422);
    }

    $entryAtColumn = $day === 'day1' ? 'day1_entry_at' : 'day2_entry_at';
    $entryByColumn = $day === 'day1' ? 'day1_entry_by' : 'day2_entry_by';

    $find = $pdo->prepare('SELECT student_code, name, payment_approved, gate_pass_created, day1_entry_at, day2_entry_at
                           FROM student_details
                           WHERE UPPER(TRIM(student_code)) = :student_code
                           ORDER BY id DESC
                           LIMIT 1');
    $find->execute([':student_code' => $studentCode]);
    $student = $find->fetch();

    if (!$student) {
        json_response(['success' => false, 'message' => 'Student not found'], 404);
    }

    $approvedState = strtolower(trim((string)($student['payment_approved'] ?? 'pending')));
    if ($approvedState !== 'approved' || (int)($student['gate_pass_created'] ?? 0) !== 1) {
        json_response(['success' => false, 'message' => 'Gate pass is not approved for this student'], 403);
    }

    $existingEntry = trim((string)($student[$entryAtColumn] ?? ''));
    if ($existingEntry !== '') {
        json_response([
            'success' => false,
            'message' => strtoupper($day) . ' entry already marked',
            'entry_at' => $existingEntry,
        ], 409);
    }

    $update = $pdo->prepare("UPDATE student_details
                             SET {$entryAtColumn} = :entry_at,
                                 {$entryByColumn} = :entry_by
                             WHERE UPPER(TRIM(student_code)) = :student_code
                               AND {$entryAtColumn} IS NULL");
    $entryTime = now_utc();
    $update->execute([
        ':entry_at' => $entryTime,
        ':entry_by' => (string)$staff['username'],
        ':student_code' => $studentCode,
    ]);

    if ($update->rowCount() === 0) {
        json_response(['success' => false, 'message' => strtoupper($day) . ' entry already exists'], 409);
    }

    json_response([
        'success' => true,
        'message' => strtoupper($day) . ' entry marked successfully',
        'entry' => [
            'student_code' => $studentCode,
            'student_name' => (string)($student['name'] ?? ''),
            'day' => $day,
            'entry_at' => $entryTime,
            'entry_by' => (string)$staff['username'],
        ],
    ]);
}
