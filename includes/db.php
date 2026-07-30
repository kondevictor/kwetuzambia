<?php
declare(strict_types=1);

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;

    $url = getenv('DATABASE_URL');
    if (!$url) throw new RuntimeException('DATABASE_URL not set');

    // Parse postgresql://user:pass@host/dbname?sslmode=require
    $parsed = parse_url($url);
    $host   = $parsed['host'];
    $port   = $parsed['port'] ?? 5432;
    $dbname = ltrim($parsed['path'], '/');
    $user   = $parsed['user'];
    $pass   = $parsed['pass'];
    $query  = $parsed['query'] ?? '';
    $ssl    = str_contains($query, 'sslmode=require') ? 'require' : 'prefer';

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$ssl";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function cuid(): string {
    // Simple CUID-compatible ID generator
    $timestamp = dechex((int)(microtime(true) * 1000));
    $random    = bin2hex(random_bytes(12));
    return 'c' . $timestamp . $random;
}

function uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        random_int(0, 0xffff), random_int(0, 0xffff),
        random_int(0, 0xffff),
        random_int(0, 0x0fff) | 0x4000,
        random_int(0, 0x3fff) | 0x8000,
        random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff)
    );
}
