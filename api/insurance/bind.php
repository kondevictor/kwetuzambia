<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$quoteId = $data['quoteId'] ?? '';
$method  = $data['method'] ?? '';
$msisdn  = trim($data['msisdnOrCardRef'] ?? '');

if (!$quoteId || !$method || !$msisdn) { json_out(['error'=>'Missing required fields'], 400); }

$pdo   = db();
$quote = $pdo->prepare('SELECT * FROM "InsuranceQuote" WHERE id = ? AND "userId" = ?');
$quote->execute([$quoteId, $user['id']]);
$quote = $quote->fetch();
if (!$quote) { json_out(['error'=>'Quote not found'], 404); }

$bd = compute_commission_on_top('INSURANCE', (int)$quote['basePremiumMinor']);

$pdo->beginTransaction();
try {
    $policyId = cuid();
    $result = run_checkout(
        userId: $user['id'],
        vertical: 'INSURANCE',
        baseAmountMinor: $bd['baseAmountMinor'],
        commissionAmountMinor: $bd['commissionAmountMinor'],
        vatAmountMinor: $bd['vatAmountMinor'],
        method: $method,
        msisdnOrCardRef: $msisdn,
        idempotencyKey: 'ins-' . $policyId,
        description: "Insurance policy: {$quote['productType']}"
    );

    $startAt = date('Y-m-d');
    $endAt   = date('Y-m-d', strtotime("+{$quote['coverageMonths']} months"));

    $pdo->prepare('INSERT INTO "InsurancePolicy" (id, "userId", "quoteId", status, "startAt", "endAt", "createdAt", "updatedAt") VALUES (?,?,?,\'ACTIVE\',?,?,NOW(),NOW())')
        ->execute([$policyId, $user['id'], $quoteId, $startAt, $endAt]);

    $pdo->commit();
    json_out(['policyId'=>$policyId,'startAt'=>$startAt,'endAt'=>$endAt], 201);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
