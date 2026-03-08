<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
header('Content-Type: text/plain; charset=utf-8');

echo "BOOTSTRAP DEBUG\n";
echo "PHP: " . PHP_VERSION . "\n";
echo "DIR: " . __DIR__ . "\n\n";

$files = [
    '/lib/response.php',
    '/lib/cors.php',
    '/lib/helpers.php',
    '/lib/upload.php',
    '/config/database.php',
    '/routes/health.php',
    '/routes/config.php',
    '/routes/students.php',
    '/routes/payments.php',
    '/routes/admin.php',
];

foreach ($files as $rel) {
    $full = __DIR__ . $rel;
    echo "Checking {$rel} ... ";

    if (!is_file($full)) {
        echo "MISSING\n";
        continue;
    }

    try {
        require_once $full;
        echo "OK\n";
    } catch (Throwable $e) {
        echo "FAILED\n";
        echo "Type: " . get_class($e) . "\n";
        echo "Message: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . "\n";
        echo "Line: " . $e->getLine() . "\n";
        exit;
    }
}

echo "\nInclude phase complete.\n";

if (!function_exists('health_route')) {
    echo "health_route function is missing after includes.\n";
    exit;
}

echo "health_route function exists.\n";

try {
    ob_start();
    health_route();
    $out = ob_get_clean();
    echo "health_route() output:\n";
    echo $out ?: "(no output)\n";
} catch (Throwable $e) {
    echo "health_route execution failed\n";
    echo "Type: " . get_class($e) . "\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
