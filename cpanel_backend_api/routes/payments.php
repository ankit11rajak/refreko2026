<?php

function upsert_student_details_on_payment_submit(
    PDO $pdo,
    string $studentCode,
    string $studentName,
    ?string $email,
    ?string $department,
    ?string $year,
    bool $foodIncluded,
    ?string $foodPreference
): void {
    $normalizedCode = strtoupper(trim($studentCode));
    $normalizedEmail = strtolower(trim((string)$email));

    $updateByCode = $pdo->prepare('UPDATE student_details
                                   SET name = :name,
                                       email = :email,
                                       department = :department,
                                       year = :year,
                                       profile_completed = 1,
                                       payment_completion = 1,
                                       gate_pass_created = 0,
                                       payment_approved = :payment_approved,
                                       food_included = :food_included,
                                       food_preference = :food_preference
                                   WHERE UPPER(TRIM(student_code)) = :student_code');
    $updateByCode->execute([
        ':name' => $studentName,
        ':email' => $email,
        ':department' => $department,
        ':year' => $year,
        ':payment_approved' => 'pending',
        ':food_included' => bool_to_int($foodIncluded),
        ':food_preference' => $foodPreference,
        ':student_code' => $normalizedCode,
    ]);

    if ($updateByCode->rowCount() > 0) {
        return;
    }

    if ($normalizedEmail !== '') {
        $updateByEmail = $pdo->prepare('UPDATE student_details
                                        SET student_code = :student_code,
                                            name = :name,
                                            email = :email,
                                            department = :department,
                                            year = :year,
                                            profile_completed = 1,
                                            payment_completion = 1,
                                            gate_pass_created = 0,
                                            payment_approved = :payment_approved,
                                            food_included = :food_included,
                                            food_preference = :food_preference
                                        WHERE LOWER(TRIM(email)) = :lookup_email');
        $updateByEmail->execute([
            ':student_code' => $normalizedCode,
            ':name' => $studentName,
            ':email' => $email,
            ':department' => $department,
            ':year' => $year,
            ':payment_approved' => 'pending',
            ':food_included' => bool_to_int($foodIncluded),
            ':food_preference' => $foodPreference,
            ':lookup_email' => $normalizedEmail,
        ]);

        if ($updateByEmail->rowCount() > 0) {
            return;
        }
    }

    $insertStmt = $pdo->prepare('INSERT INTO student_details (
                                     student_code,
                                     name,
                                     email,
                                     phone,
                                     department,
                                     year,
                                     profile_completed,
                                     payment_completion,
                                     gate_pass_created,
                                     payment_approved,
                                     food_included,
                                     food_preference
                                 ) VALUES (
                                     :student_code,
                                     :name,
                                     :email,
                                     NULL,
                                     :department,
                                     :year,
                                     1,
                                     1,
                                     0,
                                     :payment_approved,
                                     :food_included,
                                     :food_preference
                                 )');
    $insertStmt->execute([
        ':student_code' => $normalizedCode,
        ':name' => $studentName,
        ':email' => $email,
        ':department' => $department,
        ':year' => $year,
        ':payment_approved' => 'pending',
        ':food_included' => bool_to_int($foodIncluded),
        ':food_preference' => $foodPreference,
    ]);
}

function update_student_details_on_payment_decision(PDO $pdo, string $studentCode, string $decision): void
{
    $gatePassCreated = ($decision === 'approved') ? 1 : 0;

    $stmt = $pdo->prepare('UPDATE student_details
                           SET payment_completion = 1,
                               gate_pass_created = :gate_pass_created,
                               payment_approved = :payment_approved
                           WHERE UPPER(TRIM(student_code)) = :student_code');
    $stmt->execute([
        ':gate_pass_created' => $gatePassCreated,
        ':payment_approved' => $decision,
        ':student_code' => strtoupper(trim($studentCode)),
    ]);
}

function resolve_payments_student_table(PDO $pdo): string
{
    $fallback = 'student_details';
    $allowed = ['student_details', 'students', 'students_old_backup', 'std'];

    try {
        $stmt = $pdo->prepare("SELECT REFERENCED_TABLE_NAME
                               FROM information_schema.KEY_COLUMN_USAGE
                               WHERE TABLE_SCHEMA = DATABASE()
                                 AND TABLE_NAME = 'payments'
                                 AND COLUMN_NAME = 'student_code'
                                 AND REFERENCED_TABLE_NAME IS NOT NULL
                               LIMIT 1");
        $stmt->execute();
        $tableName = (string)($stmt->fetchColumn() ?: '');

        if ($tableName !== '' && in_array($tableName, $allowed, true)) {
            return $tableName;
        }
    } catch (Throwable $error) {
        error_log('Unable to resolve payments FK table, using fallback: ' . $error->getMessage());
    }

    return $fallback;
}

function payments_list(): void
{
    $status = trim((string)($_GET['status'] ?? ''));
    $search = trim((string)($_GET['search'] ?? ''));
    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);
    $limit = max(1, min(3000, $limit));
    $offset = max(0, $offset);

    $pdo = db();

    $where = [];
    $params = [];

    if ($status !== '' && in_array($status, ['pending', 'completed', 'declined'], true)) {
        $where[] = 'p.status = :status';
        $params[':status'] = $status;
    }

    if ($search !== '') {
        $where[] = '(p.student_code LIKE :search OR p.student_name LIKE :search OR p.utr_no LIKE :search OR p.transaction_id LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    $countSql = 'SELECT COUNT(*) AS total FROM payments p';
    if ($where) {
        $countSql .= ' WHERE ' . implode(' AND ', $where);
    }

    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetchColumn() ?: 0);

    $sql = 'SELECT p.* FROM payments p';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY p.id DESC LIMIT :limit OFFSET :offset';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $paramKey => $paramValue) {
        $stmt->bindValue($paramKey, $paramValue, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $payments = $stmt->fetchAll();
    
    // Add full screenshot URL for frontend
    $config = require __DIR__ . '/../config/env.php';
    $baseUrl = rtrim($_SERVER['REQUEST_SCHEME'] ?? 'https', '/') . '://' . ($_SERVER['HTTP_HOST'] ?? 'api-refresko.skf.edu.in');
    
    foreach ($payments as &$payment) {
        if (!empty($payment['screenshot_path'])) {
            $payment['screenshot'] = $baseUrl . $payment['screenshot_path'];
        } else {
            $payment['screenshot'] = null;
        }
    }

    json_response([
        'success' => true,
        'payments' => $payments,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => ($offset + count($payments)) < $total,
    ]);
}

function payments_submit_with_upload(): void
{
    $studentCode = strtoupper(trim((string)($_POST['student_code'] ?? '')));
    $studentName = trim((string)($_POST['student_name'] ?? ''));
    $email = trim((string)($_POST['email'] ?? ''));
    $department = trim((string)($_POST['department'] ?? ''));
    $year = trim((string)($_POST['year'] ?? ''));
    $utrNo = strtoupper(trim((string)($_POST['utr_no'] ?? '')));
    $paymentId = trim((string)($_POST['payment_id'] ?? ''));
    $transactionId = trim((string)($_POST['transaction_id'] ?? ''));
    $amount = (float)($_POST['amount'] ?? 0);
    $paymentMethod = trim((string)($_POST['payment_method'] ?? 'UPI'));
    $foodIncluded = filter_var($_POST['food_included'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $foodPreference = normalize_food_preference($_POST['food_preference'] ?? null);

    // Validate required fields
    if ($studentCode === '') {
        json_response(['success' => false, 'message' => 'student_code is required'], 422);
    }
    
    if ($studentName === '') {
        json_response(['success' => false, 'message' => 'student_name is required'], 422);
    }
    
    if ($utrNo === '') {
        json_response(['success' => false, 'message' => 'utr_no is required'], 422);
    }
    
    if ($paymentId === '') {
        json_response(['success' => false, 'message' => 'payment_id is required'], 422);
    }
    
    if ($transactionId === '') {
        json_response(['success' => false, 'message' => 'transaction_id is required'], 422);
    }
    
    if ($amount <= 0) {
        json_response(['success' => false, 'message' => 'amount must be greater than 0'], 422);
    }

    if ($foodIncluded && !in_array($foodPreference, ['VEG', 'NON-VEG'], true)) {
        json_response(['success' => false, 'message' => 'food_preference is required when food_included is true'], 422);
    }

    if (!$foodIncluded) {
        $foodPreference = null;
    }

    $pdo = db();
    $studentTable = resolve_payments_student_table($pdo);
    $pdo->beginTransaction();

    try {
        // Debug logging for file upload
        error_log('Payment submission - FILES array: ' . print_r($_FILES, true));
        error_log('Payment submission - Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
        
        $proof = store_payment_proof('screenshot');

        if ($studentTable === 'student_details') {
            upsert_student_details_on_payment_submit(
                $pdo,
                $studentCode,
                $studentName,
                $email !== '' ? $email : null,
                $department !== '' ? $department : null,
                $year !== '' ? $year : null,
                $foodIncluded,
                $foodPreference
            );
        } else {
            $studentUpsert = $pdo->prepare("INSERT INTO {$studentTable} (
                                            student_code,
                                            name,
                                            email,
                                            phone,
                                            department,
                                            year,
                                            profile_completed,
                                            payment_completion,
                                            gate_pass_created,
                                            payment_approved,
                                            food_included,
                                            food_preference
                                        ) VALUES (
                                            :student_code,
                                            :name,
                                            :email,
                                            :phone,
                                            :department,
                                            :year,
                                            1,
                                            1,
                                            0,
                                            :payment_approved,
                                            :food_included,
                                            :food_preference
                                        )
                                        ON DUPLICATE KEY UPDATE
                                            name = VALUES(name),
                                            email = VALUES(email),
                                            department = VALUES(department),
                                            year = VALUES(year),
                                            profile_completed = VALUES(profile_completed),
                                            payment_completion = VALUES(payment_completion),
                                            gate_pass_created = VALUES(gate_pass_created),
                                            payment_approved = VALUES(payment_approved),
                                            food_included = VALUES(food_included),
                                            food_preference = VALUES(food_preference)");

            $studentUpsert->execute([
                ':student_code' => $studentCode,
                ':name' => $studentName,
                ':email' => $email !== '' ? $email : null,
                ':phone' => null,
                ':department' => $department !== '' ? $department : null,
                ':year' => $year !== '' ? $year : null,
                ':payment_approved' => 'pending',
                ':food_included' => bool_to_int($foodIncluded),
                ':food_preference' => $foodPreference,
            ]);
        }

        $checkUtr = $pdo->prepare('SELECT student_code FROM used_utr_registry WHERE utr_no = :utr_no LIMIT 1');
        $checkUtr->execute([':utr_no' => $utrNo]);
        $existing = $checkUtr->fetch();

        if ($existing && strtoupper((string)$existing['student_code']) !== $studentCode) {
            $pdo->rollBack();
            json_response(['success' => false, 'message' => 'UTR already used by another student'], 409);
        }

        $utrUpsert = $pdo->prepare('INSERT INTO used_utr_registry (utr_no, student_code) VALUES (:utr_no, :student_code)
                                    ON DUPLICATE KEY UPDATE student_code = VALUES(student_code)');
        $utrUpsert->execute([':utr_no' => $utrNo, ':student_code' => $studentCode]);

        $paymentSql = 'INSERT INTO payments (
            payment_id, transaction_id, utr_no, student_code, student_name, email, department, year,
            amount, status, payment_approved, payment_method, food_included, food_preference,
            screenshot_path, screenshot_name
        ) VALUES (
            :payment_id, :transaction_id, :utr_no, :student_code, :student_name, :email, :department, :year,
            :amount, :status, :payment_approved, :payment_method, :food_included, :food_preference,
            :screenshot_path, :screenshot_name
        )';

        $paymentStmt = $pdo->prepare($paymentSql);
        $paymentStmt->execute([
            ':payment_id' => $paymentId,
            ':transaction_id' => $transactionId,
            ':utr_no' => $utrNo,
            ':student_code' => $studentCode,
            ':student_name' => $studentName,
            ':email' => $email,
            ':department' => $department,
            ':year' => $year,
            ':amount' => $amount,
            ':status' => 'pending',
            ':payment_approved' => 'pending',
            ':payment_method' => $paymentMethod,
            ':food_included' => bool_to_int($foodIncluded),
            ':food_preference' => $foodPreference,
            ':screenshot_path' => $proof['relative_path'],
            ':screenshot_name' => $proof['original_name'],
        ]);

        $studentUpdate = $pdo->prepare("UPDATE {$studentTable}
                                        SET payment_completion = 1,
                                            gate_pass_created = 0,
                                            payment_approved = :payment_approved,
                                            food_included = :food_included,
                                            food_preference = :food_preference
                                        WHERE UPPER(TRIM(student_code)) = :student_code");
        $studentUpdate->execute([
            ':payment_approved' => 'pending',
            ':food_included' => bool_to_int($foodIncluded),
            ':food_preference' => $foodPreference,
            ':student_code' => strtoupper(trim($studentCode)),
        ]);

        if ($studentTable !== 'student_details') {
            upsert_student_details_on_payment_submit(
                $pdo,
                $studentCode,
                $studentName,
                $email !== '' ? $email : null,
                $department !== '' ? $department : null,
                $year !== '' ? $year : null,
                $foodIncluded,
                $foodPreference
            );
        }

        $pdo->commit();

        log_event('payment_submit', 'payment', $paymentId, [
            'student_code' => $studentCode,
            'amount' => $amount,
            'status' => 'pending'
        ], $email !== '' ? $email : null);

        json_response([
            'success' => true,
            'message' => 'Payment submitted successfully',
            'payment' => [
                'payment_id' => $paymentId,
                'transaction_id' => $transactionId,
                'utr_no' => $utrNo,
                'screenshot_path' => $proof['relative_path'],
                'screenshot_name' => $proof['original_name'],
            ]
        ], 201);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Payment submission error: ' . $error->getMessage());
        error_log('Payment submission trace: ' . $error->getTraceAsString());
        json_response(['success' => false, 'message' => 'Unable to submit payment: ' . $error->getMessage()], 500);
    }
}

function payments_update_status(): void
{
    $payload = get_json_input();
    require_fields($payload, ['payment_id', 'decision']);

    $paymentId = trim((string)$payload['payment_id']);
    $decision = strtolower(trim((string)$payload['decision']));

    if (!in_array($decision, ['approved', 'declined'], true)) {
        json_response(['success' => false, 'message' => 'decision must be approved/declined'], 422);
    }

    $nextStatus = $decision === 'approved' ? 'completed' : 'declined';
    $gatePassCreated = ($decision === 'approved') ? 1 : 0;
    $paymentCompletion = 1;

    $pdo = db();
    $studentTable = resolve_payments_student_table($pdo);
    $pdo->beginTransaction();

    try {
        $fetch = $pdo->prepare('SELECT payment_id, student_code FROM payments WHERE payment_id = :payment_id LIMIT 1');
        $fetch->execute([':payment_id' => $paymentId]);
        $payment = $fetch->fetch();

        if (!$payment) {
            $pdo->rollBack();
            json_response(['success' => false, 'message' => 'Payment not found'], 404);
        }

        $updatePayment = $pdo->prepare('UPDATE payments
                                        SET status = :status,
                                            payment_approved = :payment_approved,
                                            reviewed_at = :reviewed_at
                                        WHERE payment_id = :payment_id');
        $updatePayment->execute([
            ':status' => $nextStatus,
            ':payment_approved' => $decision,
            ':reviewed_at' => now_utc(),
            ':payment_id' => $paymentId,
        ]);

        $updateStudent = $pdo->prepare("UPDATE {$studentTable}
                                        SET payment_completion = :payment_completion,
                                            gate_pass_created = :gate_pass_created,
                                            payment_approved = :payment_approved
                                        WHERE UPPER(TRIM(student_code)) = :student_code");
        $updateStudent->execute([
            ':payment_completion' => $paymentCompletion,
            ':gate_pass_created' => $gatePassCreated,
            ':payment_approved' => $decision,
            ':student_code' => strtoupper(trim((string)$payment['student_code'])),
        ]);

        $rowsAffected = $updateStudent->rowCount();

        update_student_details_on_payment_decision($pdo, (string)$payment['student_code'], $decision);

        $pdo->commit();

        log_event('payment_decision', 'payment', $paymentId, [
            'decision' => $decision,
            'status' => $nextStatus,
            'student_code' => $payment['student_code']
        ]);
        json_response([
            'success' => true,
            'message' => 'Payment status updated',
            'debug' => [
                'student_code' => $payment['student_code'],
                'gate_pass_created' => $gatePassCreated,
                'payment_completion' => $paymentCompletion,
                'rows_affected' => $rowsAffected
            ]
        ]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(['success' => false, 'message' => 'Unable to update payment status', 'error' => $error->getMessage()], 500);
    }
}