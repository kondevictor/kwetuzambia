<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
if (!in_array($user['role'], ['SUPPLIER','ADMIN'])) { json_out(['error'=>'Forbidden'], 403); }

$data = body();
$origin      = trim($data['origin'] ?? '');
$destination = trim($data['destination'] ?? '');
$departAt    = $data['departAt'] ?? '';
$priceZmw    = (float)($data['basePriceZmw'] ?? 0);
$plate       = trim($data['busPlate'] ?? '');
$totalSeats  = max(1, (int)($data['totalSeats'] ?? 50));

if (!$origin || !$destination || !$departAt || $priceZmw <= 0 || !$plate) {
    json_out(['error'=>'Missing required fields'], 400);
}

$pdo = db();

// Get or create Operator for this supplier
$op = $pdo->prepare('SELECT * FROM "Operator" WHERE "ownerId" = ? LIMIT 1');
$op->execute([$user['id']]);
$op = $op->fetch();
if (!$op) {
    $opId = cuid();
    $pdo->prepare('INSERT INTO "Operator" (id, "ownerId", name, verified, "createdAt", "updatedAt") VALUES (?,?,?,false,NOW(),NOW())')
        ->execute([$opId, $user['id'], $user['name'] . "'s Bus Company"]);
    $op = ['id'=>$opId];
}

$routeId = cuid();
$pdo->prepare('INSERT INTO "Route" (id, "operatorId", origin, destination, "createdAt", "updatedAt") VALUES (?,?,?,?,NOW(),NOW())')
    ->execute([$routeId, $op['id'], $origin, $destination]);

$tripId       = cuid();
$priceMinor   = (int)round($priceZmw * 100);
$departTs     = date('Y-m-d H:i:s', strtotime($departAt));
$pdo->prepare('INSERT INTO "Trip" (id, "routeId", "busPlate", "departAt", "basePriceMinor", "totalSeats", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,NOW(),NOW())')
    ->execute([$tripId, $routeId, $plate, $departTs, $priceMinor, $totalSeats]);

// Create seats A1–Z99 up to totalSeats
for ($i = 1; $i <= $totalSeats; $i++) {
    $seatId = cuid();
    $seatNo = (string)$i;
    $pdo->prepare('INSERT INTO "Seat" (id, "tripId", "seatNo", status, "createdAt", "updatedAt") VALUES (?,?,?,\'AVAILABLE\',NOW(),NOW())')
        ->execute([$seatId, $tripId, $seatNo]);
}

json_out(['tripId'=>$tripId,'routeId'=>$routeId,'seats'=>$totalSeats], 201);
