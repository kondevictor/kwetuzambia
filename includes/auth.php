<?php
declare(strict_types=1);

function auth_secret(): string {
    $s = getenv('NEXTAUTH_SECRET');
    if (!$s) throw new RuntimeException('NEXTAUTH_SECRET not set');
    return $s;
}

function auth_create_token(array $user): string {
    $payload = base64_encode(json_encode([
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'exp'   => time() + 86400 * 7,
    ]));
    $sig = hash_hmac('sha256', $payload, auth_secret());
    return $payload . '.' . $sig;
}

function auth_verify_token(string $token): ?array {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return null;
    [$payload, $sig] = $parts;
    if (!hash_equals(hash_hmac('sha256', $payload, auth_secret()), $sig)) return null;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function auth_set_cookie(array $user): void {
    $token = auth_create_token($user);
    setcookie('kwetu_session', $token, [
        'expires'  => time() + 86400 * 7,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => isset($_SERVER['HTTPS']),
    ]);
}

function auth_clear_cookie(): void {
    setcookie('kwetu_session', '', ['expires' => time() - 1, 'path' => '/']);
}

function current_user(): ?array {
    $token = $_COOKIE['kwetu_session'] ?? '';
    if (!$token) return null;
    return auth_verify_token($token);
}

function require_auth(): array {
    $user = current_user();
    if (!$user) {
        header('Location: /login');
        exit;
    }
    return $user;
}

function require_admin(): array {
    $user = require_auth();
    if ($user['role'] !== 'ADMIN') {
        http_response_code(403);
        json_out(['error' => 'Forbidden']);
        exit;
    }
    return $user;
}
