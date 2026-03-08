<?php

function config_get_active(): void
{
    $pdo = db();
    $stmt = $pdo->query('SELECT option_id, amount, upi_id, payee_name, note_text, include_food, is_active FROM payment_gateway_config ORDER BY id ASC');
    $rows = $stmt->fetchAll();

    $active = null;
    foreach ($rows as $row) {
        if ((int)$row['is_active'] === 1) {
            $active = $row;
            break;
        }
    }

    if (!$active && count($rows) > 0) {
        $active = $rows[0];
    }

    json_response([
        'success' => true,
        'active' => $active,
        'options' => $rows,
    ]);
}

function config_set_active(): void
{
    $payload = get_json_input();
    $optionId = trim((string)($payload['option_id'] ?? $payload['activeOptionId'] ?? ''));
    $options = $payload['options'] ?? null;

    if ($optionId === '' && (!is_array($options) || count($options) === 0)) {
        json_response(['success' => false, 'message' => 'option_id or options payload is required'], 422);
    }

    $pdo = db();
    $pdo->beginTransaction();

    try {
        if (is_array($options) && count($options) > 0) {
            $upsert = $pdo->prepare('INSERT INTO payment_gateway_config (
                                        option_id, amount, upi_id, payee_name, note_text, include_food, is_active
                                     ) VALUES (
                                        :option_id, :amount, :upi_id, :payee_name, :note_text, :include_food, 0
                                     )
                                     ON DUPLICATE KEY UPDATE
                                        amount = VALUES(amount),
                                        upi_id = VALUES(upi_id),
                                        payee_name = VALUES(payee_name),
                                        note_text = VALUES(note_text),
                                        include_food = VALUES(include_food)');

            foreach ($options as $item) {
                $itemId = trim((string)($item['id'] ?? $item['option_id'] ?? ''));
                $amount = (float)($item['amount'] ?? 0);
                $upiId = trim((string)($item['upiId'] ?? $item['upi_id'] ?? ''));
                $payeeName = trim((string)($item['payeeName'] ?? $item['payee_name'] ?? 'Refresko 2026'));
                $noteText = trim((string)($item['note'] ?? $item['note_text'] ?? ''));
                $includeFood = filter_var($item['includeFood'] ?? $item['include_food'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if ($itemId === '' || $amount <= 0 || $upiId === '') {
                    $pdo->rollBack();
                    json_response(['success' => false, 'message' => 'Invalid options payload'], 422);
                }

                if ((int)round($amount) === 600) {
                    $includeFood = true;
                }

                if ($noteText === '') {
                    $noteText = 'Refresko Registration ₹' . (int)round($amount);
                }

                $upsert->execute([
                    ':option_id' => $itemId,
                    ':amount' => $amount,
                    ':upi_id' => $upiId,
                    ':payee_name' => $payeeName,
                    ':note_text' => $noteText,
                    ':include_food' => bool_to_int($includeFood),
                ]);

                if ($optionId === '') {
                    $optionId = $itemId;
                }
            }
        }

        if ($optionId === '') {
            $pdo->rollBack();
            json_response(['success' => false, 'message' => 'Unable to resolve active option'], 422);
        }

        $clear = $pdo->prepare('UPDATE payment_gateway_config SET is_active = 0');
        $clear->execute();

        $set = $pdo->prepare('UPDATE payment_gateway_config SET is_active = 1 WHERE option_id = :option_id');
        $set->execute([':option_id' => $optionId]);

        if ($set->rowCount() === 0) {
            $pdo->rollBack();
            json_response(['success' => false, 'message' => 'Option not found'], 404);
        }

        $pdo->commit();
        json_response(['success' => true, 'message' => 'Active payment option updated']);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(['success' => false, 'message' => 'Unable to update payment config', 'error' => $error->getMessage()], 500);
    }
}
