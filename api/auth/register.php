<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/loyalty.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$data  = body();
$name  = trim($data['name'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$phone = trim($data['phone'] ?? '');
$pass  = $data['password'] ?? '';

if (!$name || !$email || !$pass) { json_out(['error'=>'Name, email and password required'], 400); }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { json_out(['error'=>'Invalid email'], 400); }
if (strlen($pass) < 8) { json_out(['error'=>'Password must be at least 8 characters'], 400); }

$pdo = db();
$exists = $pdo->prepare('SELECT id FROM "User" WHERE email = ?');
$exists->execute([$email]);
if ($exists->fetch()) { json_out(['error'=>'Email already registered'], 409); }

$id   = cuid();
$hash = password_hash($pass, PASSWORD_BCRYPT);

$pdo->prepare('INSERT INTO "User" (id, name, email, phone, password, role, "createdAt", "updatedAt") VALUES (?,?,?,?,?,\'CUSTOMER\',NOW(),NOW())')
    ->execute([$id, $name, $email, $phone ?: null, $hash]);

// Create wallet + grant welcome bonus
$wid = cuid();
$pdo->prepare('INSERT INTO "Wallet" (id, "userId", "balanceMinor", "loyaltyPoints", "completedBookingsCount", "createdAt", "updatedAt") VALUES (?,?,0,?,0,NOW(),NOW())')
    ->execute([$wid, $id, WELCOME_BONUS_POINTS]);

$user = $pdo->prepare('SELECT * FROM "User" WHERE id = ?');
$user->execute([$id]);
$user = $user->fetch();

auth_set_cookie($user);
json_out(['ok'=>true,'name'=>$user['name'],'role'=>$user['role']], 201);
