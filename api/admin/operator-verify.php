<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

require_admin();
$data = body();
$operatorId = $data['operatorId'] ?? '';
$verified   = (bool)($data['verified'] ?? false);

if (!$operatorId) { json_out(['error'=>'operatorId required'], 400); }

$pdo = db();
$pdo->prepare('UPDATE "Operator" SET verified = ?, "updatedAt" = NOW() WHERE id = ?')
    ->execute([$verified ? 1 : 0, $operatorId]);

json_out(['ok'=>true,'verified'=>$verified]);
