<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$roomId  = $data['roomId'] ?? '';
$checkin = $data['checkin'] ?? '';
$checkout= $data['checkout'] ?? '';
$method  = $data['method'] ?? '';
$msisdn  = trim($data['msisdnOrCardRef'] ?? '');

if (!$roomId || !$checkin || !$checkout || !$method || !$msisdn) {
    json_out(['error'=>'Missing required fields'], 400);
}

$nights = max(1, (int)((strtotime($checkout) - strtotime($checkin)) / 86400));

$pdo = db();
$room = $pdo->prepare('SELECT * FROM "Room" WHERE id = ?');
$room->execute([$roomId]);
$room = $room->fetch();
if (!$room) { json_out(['error'=>'Room not found'], 404); }

$bd = compute_commission_on_top('ACCOMMODATION', (int)$room['ratePerNightMinor']);
$totalBase = $bd['baseAmountMinor'] * $nights;
$totalFee  = $bd['commissionAmountMinor'] * $nights;
$totalVat  = $bd['vatAmountMinor'] * $nights;

$pdo->beginTransaction();
try {
    $bookingId = cuid();
    $result = run_checkout(
        $user['id'],
        'ACCOMMODATION',
        $totalBase,
        $method,
        $msisdn,
        'stay-' . $bookingId,
        "Stay booking $nights night(s)"
    );

    $pdo->prepare('INSERT INTO "StayBooking" (id, "userId", "roomId", "checkIn", "checkOut", "totalMinor", "feeWaived", status, "createdAt") VALUES (?,?,?,?,?,?,?,\'CONFIRMED\',NOW())')
        ->execute([$bookingId, $user['id'], $roomId, $checkin, $checkout, $totalBase+$totalFee+$totalVat, $result['feeWaived'] ? 1 : 0]);

    $pdo->commit();
    json_out(['bookingId'=>$bookingId,'feeWaived'=>$result['feeWaived']], 201);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
