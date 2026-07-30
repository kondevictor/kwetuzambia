<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/checkout.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

require_admin();
$data = body();

$paymentId = $data['paymentId'] ?? '';
$reason    = trim($data['reason'] ?? '');

if (!$paymentId || !$reason) { json_out(['error'=>'paymentId and reason required'], 400); }

try {
    $result = run_refund($paymentId, $reason, 'admin-refund-' . $paymentId);
    json_out($result);
} catch (\Throwable $e) {
    json_out(['error'=>$e->getMessage()], 500);
}
