<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { header('Location: /login'); exit; }

// Accept both JSON (API) and form data (HTML form)
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($ct, 'application/json')) {
    $data = body();
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $is_json  = true;
} else {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $is_json  = false;
}

if (!$email || !$password) {
    if ($is_json) json_out(['error'=>'Email and password required'], 400);
    header('Location: /login?error=' . urlencode('Email and password required')); exit;
}

$pdo  = db();
$stmt = $pdo->prepare('SELECT * FROM "User" WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['passwordHash'])) {
    if ($is_json) json_out(['error'=>'Invalid email or password'], 401);
    header('Location: /login?error=' . urlencode('Invalid email or password')); exit;
}

auth_set_cookie($user);

if ($is_json) {
    json_out(['ok'=>true,'name'=>$user['name'],'role'=>$user['role']]);
}
header('Location: /dashboard');
exit;
