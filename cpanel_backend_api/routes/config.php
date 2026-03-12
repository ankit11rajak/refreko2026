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
    require_fields($payload, ['option_id']);

    $optionId = trim((string)$payload['option_id']);
    if ($optionId === '') {
        json_response(['success' => false, 'message' => 'Invalid option_id'], 422);
    }

    $pdo = db();
    $pdo->beginTransaction();

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
}
