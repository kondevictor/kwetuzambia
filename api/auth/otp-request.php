<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$data  = body();
$phone = trim($data['phone'] ?? '');
if (!$phone) { json_out(['error'=>'Phone required'], 400); }

$pdo = db();
$user = $pdo->prepare('SELECT id FROM "User" WHERE phone = ?');
$user->execute([$phone]);
$user = $user->fetch();

if (!$user) { json_out(['error'=>'No account found for this phone number'], 404); }

// 6-digit OTP, valid 10 minutes
$otp     = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expires = date('Y-m-d H:i:s', time() + 600);

// Upsert OTP record
$pdo->prepare('DELETE FROM "OtpCode" WHERE phone = ?')->execute([$phone]);
$pdo->prepare('INSERT INTO "OtpCode" (id, phone, code, "expiresAt", "createdAt") VALUES (?,?,?,?,NOW())')
    ->execute([cuid(), $phone, $otp, $expires]);

// In production: send via SMS gateway. For now, return it (dev mode).
json_out(['ok'=>true,'dev_otp'=>$otp]);
