<?php

function health_route(): void
{
    json_response([
        'success' => true,
        'message' => 'API healthy',
        'time' => now_utc(),
    ]);
}
