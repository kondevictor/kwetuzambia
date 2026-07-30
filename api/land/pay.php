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
$listing = $pdo->prepare('SELECT * FROM "LandListing" WHERE id = ?');
$listing->execute([$listingId]);
$listing = $listing->fetch();
if (!$listing) { json_out(['error'=>'Listing not found'], 404); }

$fee = (int)$listing['placementFeeMinor'];

$pdo->beginTransaction();
try {
    $enquiryId = cuid();
    run_placement_fee_checkout(
        $user['id'],
        $fee,
        $method,
        $msisdn,
        'land-' . $enquiryId,
        "Land listing enquiry: {$listing['title']}"
    );

    $pdo->commit();
    json_out(['sellerContact'=>$listing['contactPhone']]);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
