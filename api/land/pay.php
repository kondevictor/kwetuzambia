<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$listingId = $data['listingId'] ?? '';
$method    = $data['method'] ?? '';
$msisdn    = trim($data['msisdnOrCardRef'] ?? '');

if (!$listingId || !$method || !$msisdn) { json_out(['error'=>'Missing required fields'], 400); }

$pdo     = db();
$listing = $pdo->prepare('SELECT * FROM "LandListing" WHERE id = ? AND "isActive" = true');
$listing->execute([$listingId]);
$listing = $listing->fetch();
if (!$listing) { json_out(['error'=>'Listing not found'], 404); }

$fee = placement_fee_for_land((int)$listing['askingPriceMinor']);

$pdo->beginTransaction();
try {
    $enquiryId = cuid();
    run_placement_fee_checkout(
        userId: $user['id'],
        feeAmountMinor: $fee,
        method: $method,
        msisdnOrCardRef: $msisdn,
        idempotencyKey: 'land-' . $enquiryId,
        description: "Land listing enquiry: {$listing['title']}"
    );

    $pdo->prepare('INSERT INTO "LandEnquiry" (id, "userId", "listingId", status, "createdAt") VALUES (?,?,?,\'PAID\',NOW())')
        ->execute([$enquiryId, $user['id'], $listingId]);

    $seller = $pdo->prepare('SELECT phone, email FROM "User" WHERE id = ?');
    $seller->execute([$listing['sellerId']]);
    $seller = $seller->fetch();

    $pdo->commit();
    json_out(['enquiryId'=>$enquiryId,'sellerContact'=>$seller['phone'] ?? $seller['email'] ?? 'N/A']);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
