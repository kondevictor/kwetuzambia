<?php
declare(strict_types=1);

function format_zmw(int $minor): string {
    return 'ZMW ' . number_format($minor / 100, 2);
}

function json_out(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw ?: '{}', true) ?? [];
}

function method_is(string $m): bool {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? '') === strtoupper($m);
}
