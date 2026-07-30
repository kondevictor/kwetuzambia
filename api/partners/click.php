<?php
require_once __DIR__ . '/../../includes/db.php';

$id = $_GET['id'] ?? '';
if (!$id) { header('Location: /partners'); exit; }

$pdo = db();
$deal = $pdo->prepare('SELECT * FROM "PartnerDeal" WHERE id = ? AND "isActive" = true');
$deal->execute([$id]);
$deal = $deal->fetch();
if (!$deal) { header('Location: /partners'); exit; }

// Track click
$pdo->prepare('UPDATE "PartnerDeal" SET clicks = clicks + 1, "updatedAt" = NOW() WHERE id = ?')->execute([$id]);

$redirect = $deal['affiliateUrl'] ?? $deal['websiteUrl'] ?? '/partners';
header('Location: ' . $redirect);
exit;
