<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/money.php';

$id = $_GET['id'] ?? '';
if (!$id) { json_out(['error'=>'id required'], 400); }

$pdo = db();
// Release stale holds
$pdo->prepare('UPDATE "Seat" SET status = \'AVAILABLE\', "heldUntil" = NULL WHERE "tripId" = ? AND status = \'HELD\' AND "heldUntil" < NOW()')->execute([$id]);

$seats = $pdo->prepare('SELECT id, "seatNo", status FROM "Seat" WHERE "tripId" = ? ORDER BY "seatNo" ASC');
$seats->execute([$id]);
json_out(['seats'=>$seats->fetchAll(PDO::FETCH_ASSOC)]);
