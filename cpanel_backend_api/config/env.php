<?php

return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'skfedbzl_refresko_prod',
        'user' => 'skfedbzl_refapi_api',
        'pass' => 'refresko26',
        'charset' => 'utf8mb4',
    ],

    'cors_allowed_origins' => [
        'https://refresko.skf.edu.in',
        'https://api-refresko.skf.edu.in',
        'http://localhost:5173',
        'https://refresko-final.vercel.app',
    ],
    'max_upload_mb' => 10,
    'upload_dir' => __DIR__ . '/../uploads/payment-proofs',
    'base_upload_url' => '/uploads/payment-proofs',
];
