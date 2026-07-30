<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$tierId = $data['ticketTierId'] ?? '';
$method = $data['method'] ?? '';
$msisdn = trim($data['msisdnOrCardRef'] ?? '');

if (!$tierId || !$method || !$msisdn) { json_out(['error'=>'Missing required fields'], 400); }

$pdo  = db();
$tier = $pdo->prepare('SELECT * FROM "TicketTier" WHERE id = ?');
$tier->execute([$tierId]);
$tier = $tier->fetch();
if (!$tier) { json_out(['error'=>'Ticket tier not found'], 404); }
if ((int)$tier['remaining'] <= 0) { json_out(['error'=>'No tickets remaining'], 409); }

$bd = compute_commission_on_top('EVENT', (int)$tier['basePriceMinor']);

$pdo->beginTransaction();
try {
    $ticketId = cuid();
    $result = run_checkout(
        userId: $user['id'],
        vertical: 'EVENT',
        baseAmountMinor: $bd['baseAmountMinor'],
        commissionAmountMinor: $bd['commissionAmountMinor'],
        vatAmountMinor: $bd['vatAmountMinor'],
        method: $method,
        msisdnOrCardRef: $msisdn,
        idempotencyKey: 'event-' . $ticketId,
        description: "Event ticket tier {$tierId}"
    );

    $qr = strtoupper(bin2hex(random_bytes(8)));
    $pdo->prepare('INSERT INTO "EventTicket" (id, "userId", "ticketTierId", "totalMinor", "feeWaived", "qrCode", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,NOW(),NOW())')
        ->execute([$ticketId, $user['id'], $tierId, $bd['totalAmountMinor'], $result['feeWaived'] ? 1 : 0, $qr]);

    $pdo->prepare('UPDATE "TicketTier" SET remaining = remaining - 1, "updatedAt" = NOW() WHERE id = ?')->execute([$tierId]);
    $pdo->commit();
    json_out(['ticketId'=>$ticketId,'qrCode'=>$qr], 201);
} catch (\Throwable $e) {
    $pdo->rollBack();
    json_out(['error'=>$e->getMessage()], 500);
}
