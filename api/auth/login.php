<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$data = body();
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) { json_out(['error'=>'Email and password required'], 400); }

$pdo  = db();
$stmt = $pdo->prepare('SELECT * FROM "User" WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['passwordHash'])) {
    json_out(['error'=>'Invalid email or password'], 401);
}

auth_set_cookie($user);
json_out(['ok'=>true,'name'=>$user['name'],'role'=>$user['role']]);
