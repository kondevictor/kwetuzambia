<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$data  = body();
$phone = trim($data['phone'] ?? '');
$code  = trim($data['code'] ?? '');
if (!$phone || !$code) { json_out(['error'=>'Phone and code required'], 400); }

$pdo = db();
$otpRow = $pdo->prepare('SELECT * FROM "PhoneOtp" WHERE phone = ? AND code = ? AND "expiresAt" > NOW() AND consumed = false');
$otpRow->execute([$phone, $code]);
$otpRow = $otpRow->fetch();

if (!$otpRow) { json_out(['error'=>'Invalid or expired OTP'], 401); }

$pdo->prepare('UPDATE "PhoneOtp" SET consumed = true WHERE id = ?')->execute([$otpRow['id']]);

$user = $pdo->prepare('SELECT * FROM "User" WHERE phone = ?');
$user->execute([$phone]);
$user = $user->fetch();
if (!$user) { json_out(['error'=>'User not found'], 404); }

auth_set_cookie($user);
json_out(['ok'=>true,'name'=>$user['name'],'role'=>$user['role']]);
