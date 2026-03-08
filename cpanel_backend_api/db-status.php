<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: application/json; charset=utf-8');

try {
    require __DIR__ . '/config/database.php';
    
    $pdo = db();
    
    // Test 1: Basic connection
    $connectionOk = $pdo ? true : false;
    
    // Test 2: Query execution
    $result = $pdo->query('SELECT 1 AS test')->fetchColumn();
    $queryOk = ($result == 1);
    
    // Test 3: Check tables exist
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $requiredTables = ['student_details', 'payments', 'payment_gateway_config', 'used_utr_registry', 'admin_users', 'super_admin_credentials'];
    $missingTables = array_diff($requiredTables, $tables);
    
    // Test 4: Count records
    $counts = [];
    foreach ($requiredTables as $table) {
        if (in_array($table, $tables)) {
            $count = $pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
            $counts[$table] = (int)$count;
        }
    }
    
    echo json_encode([
        'success' => true,
        'connection' => $connectionOk ? 'OK' : 'FAILED',
        'query_test' => $queryOk ? 'OK' : 'FAILED',
        'tables_found' => $tables,
        'missing_tables' => $missingTables,
        'record_counts' => $counts,
        'timestamp' => gmdate('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ], JSON_PRETTY_PRINT);
}
