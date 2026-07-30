<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$listingId     = $data['listingId'] ?? '';
$scheduledDate = $data['scheduledDate'] ?? '';
$method        = $data['method'] ?? '';
$msisdn        = trim($data['msisdnOrCardRef'] ?? '');

if (!$listingId || !$method || !$msisdn) { json_out(['error'=>'Missing required fields'], 400); }

$pdo     = db();
$listing = $pdo->prepare('SELECT * FROM "ServiceListing" WHERE id = ? AND "isActive" = true');
$listing->execute([$listingId]);
$listing = $listing->fetch();
if (!$listing) { json_out(['error'=>'Listing not found'], 404); }

$bd = compute_commission_on_top('SERVICE', (int)$listing['basePriceMinor']);

$pdo->beginTransaction();
try {
    $bookingId = cuid();
    $result = run_checkout(
        userId: $user['id'],
        vertical: 'SERVICE',
        baseAmountMinor: $bd['baseAmountMinor'],
        commissionAmountMinor: $bd['commissionAmountMinor'],
        vatAmountMinor: $bd['vatAmountMinor'],
        method: $method,
        msisdnOrCardRef: $msisdn,
        idempotencyKey: 'svc-' . $bookingId,
        description: "Service booking: {$listing['title']}"
    );

    $pdo->prepare('INSERT INTO "ServiceBooking" (id, "userId", "listingId", "scheduledDate", "totalMinor", "feeWaived", status, "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,\'CONFIRMED\',NOW(),NOW())')
        ->execute([$bookingId, $user['id'], $listingId, $scheduledDate ?: null, $bd['totalAmountMinor'], $result['feeWaived'] ? 1 : 0]);

    $pdo->commit();
    json_out(['bookingId'=>$bookingId,'feeWaived'=>$result['feeWaived']], 201);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
