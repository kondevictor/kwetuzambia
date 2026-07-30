<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';

$id = $_GET['id'] ?? '';
if (!$id) { header('Location: /partners'); exit; }

$pdo = db();
$partner = $pdo->prepare('SELECT * FROM "ReferralPartner" WHERE id = ?');
$partner->execute([$id]);
$partner = $partner->fetch();
if (!$partner) { header('Location: /partners'); exit; }

// Track click
$user = current_user();
$clickId = cuid();
$pdo->prepare('INSERT INTO "ReferralClick" (id, "partnerId", "userId", "createdAt") VALUES (?,?,?,NOW())')
    ->execute([$clickId, $id, $user['id'] ?? null]);

header('Location: ' . $partner['outboundUrl']);
exit;
