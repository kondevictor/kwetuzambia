<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$tripId        = $data['tripId'] ?? '';
$seatNos       = $data['seatNos'] ?? [];
$passengerName = trim($data['passengerName'] ?? '');
$method        = $data['method'] ?? '';
$msisdn        = trim($data['msisdnOrCardRef'] ?? '');

if (!$tripId || empty($seatNos) || !$passengerName || !$method || !$msisdn) {
    json_out(['error'=>'Missing required fields'], 400);
}

$pdo = db();

// Release stale holds
$pdo->prepare('UPDATE "Seat" SET status = \'AVAILABLE\', "heldUntil" = NULL WHERE "tripId" = ? AND status = \'HELD\' AND "heldUntil" < NOW()')->execute([$tripId]);

// Check availability
$in = implode(',', array_fill(0, count($seatNos), '?'));
$params = array_merge([$tripId], $seatNos);
$check = $pdo->prepare("SELECT id, \"seatNo\", status FROM \"Seat\" WHERE \"tripId\" = ? AND \"seatNo\" IN ($in)");
$check->execute($params);
$found = $check->fetchAll();

$unavailable = array_filter($found, fn($s) => $s['status'] !== 'AVAILABLE');
if (!empty($unavailable)) {
    $nos = implode(', ', array_column(array_values($unavailable), 'seatNo'));
    json_out(['error'=>"Seat(s) $nos are no longer available"], 409);
}
if (count($found) !== count($seatNos)) {
    json_out(['error'=>'One or more seats not found'], 404);
}

// Get trip pricing
$trip = $pdo->prepare('SELECT * FROM "Trip" WHERE id = ?');
$trip->execute([$tripId]);
$trip = $trip->fetch();
if (!$trip) { json_out(['error'=>'Trip not found'], 404); }

$n  = count($seatNos);
$bd = compute_commission_on_top('BUS', (int)$trip['basePriceMinor']);
$total = ($bd['baseAmountMinor'] + $bd['commissionAmountMinor'] + $bd['vatAmountMinor']) * $n;

$pdo->beginTransaction();
try {
    $bookingId  = cuid();
    $idempotency = 'bus-' . $bookingId;

    $result = run_checkout(
        userId: $user['id'],
        vertical: 'BUS',
        baseAmountMinor: $bd['baseAmountMinor'] * $n,
        commissionAmountMinor: $bd['commissionAmountMinor'] * $n,
        vatAmountMinor: $bd['vatAmountMinor'] * $n,
        method: $method,
        msisdnOrCardRef: $msisdn,
        idempotencyKey: $idempotency,
        description: "Bus booking {$trip['origin']} → {$trip['destination']} x$n seats"
    );

    $feeWaived = $result['feeWaived'];

    $pdo->prepare('INSERT INTO "BusBooking" (id, "userId", "tripId", "passengerName", "totalMinor", "feeWaived", status, "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,\'CONFIRMED\',NOW(),NOW())')
        ->execute([$bookingId, $user['id'], $tripId, $passengerName, $total, $feeWaived ? 1 : 0]);

    // Mark seats BOOKED and link to booking
    foreach ($found as $seat) {
        $pdo->prepare('UPDATE "Seat" SET status = \'BOOKED\', "bookingId" = ?, "updatedAt" = NOW() WHERE id = ?')
            ->execute([$bookingId, $seat['id']]);
    }

    $pdo->commit();
    json_out(['bookingId'=>$bookingId, 'feeWaived'=>$feeWaived], 201);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
