<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/loyalty.php';

if (!method_is('POST')) { header('Location: /register'); exit; }

$ct = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($ct, 'application/json')) {
    $data = body();
    $is_json = true;
} else {
    $data = $_POST;
    $is_json = false;
}

$name  = trim($data['name'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$phone = trim($data['phone'] ?? '');
$pass  = $data['password'] ?? '';

function reg_err(bool $is_json, string $msg): void {
    if ($is_json) { json_out(['error'=>$msg], 400); }
    header('Location: /register?error=' . urlencode($msg)); exit;
}

if (!$name || !$email || !$pass) reg_err($is_json, 'Name, email and password required');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) reg_err($is_json, 'Invalid email');
if (strlen($pass) < 8) reg_err($is_json, 'Password must be at least 8 characters');

$pdo = db();
$exists = $pdo->prepare('SELECT id FROM "User" WHERE email = ?');
$exists->execute([$email]);
if ($exists->fetch()) reg_err($is_json, 'Email already registered');

$id   = cuid();
$hash = password_hash($pass, PASSWORD_BCRYPT);

$pdo->prepare('INSERT INTO "User" (id, name, email, phone, "passwordHash", role, "createdAt") VALUES (?,?,?,?,?,\'CONSUMER\',NOW())')
    ->execute([$id, $name, $email, $phone ?: null, $hash]);

$wid = cuid();
$pdo->prepare('INSERT INTO "Wallet" (id, "userId", "loyaltyPoints", "updatedAt") VALUES (?,?,?,NOW())')
    ->execute([$wid, $id, WELCOME_BONUS_POINTS]);

$user = $pdo->prepare('SELECT * FROM "User" WHERE id = ?');
$user->execute([$id]);
$user = $user->fetch();

auth_set_cookie($user);

if ($is_json) json_out(['ok'=>true,'name'=>$user['name'],'role'=>$user['role']], 201);
header('Location: /dashboard');
exit;
