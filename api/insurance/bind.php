<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/payments.php';
require_once __DIR__ . '/../../includes/ledger.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$quoteId = $data['quoteId'] ?? '';
$method  = $data['method'] ?? '';
$msisdn  = trim($data['msisdnOrCardRef'] ?? '');

if (!$quoteId || !$method || !$msisdn) { json_out(['error'=>'Missing required fields'], 400); }

$pdo   = db();
$quote = $pdo->prepare('SELECT * FROM "InsuranceQuote" WHERE id = ?');
$quote->execute([$quoteId]);
$quote = $quote->fetch();
if (!$quote) { json_out(['error'=>'Quote not found'], 404); }

$existing = $pdo->prepare('SELECT id FROM "InsurancePolicy" WHERE "quoteId" = ?');
$existing->execute([$quoteId]);
if ($existing->fetchColumn()) { json_out(['error'=>'Policy already bound for this quote'], 409); }

$ikey = 'ins-' . $quoteId;
$charge = mock_charge((string)$quote['premiumMinor'], $method, $msisdn, $ikey);

$paymentId = cuid();
$pdo->prepare('INSERT INTO "Payment" (id, "idempotencyKey", provider, method, status, "amountMinor", reference, "createdAt") VALUES (?,?,?,?,?,?,?,NOW())')
    ->execute([$paymentId, $ikey, 'MockMoneyProvider', $method, $charge['status'], $quote['premiumMinor'], $charge['reference']]);

if ($charge['status'] !== 'SUCCEEDED') {
    json_out(['error'=>'Payment failed'], 402);
}

$cash = get_or_create_platform_account('CASH_CLEARING',    'Cash Clearing');
$rev  = get_or_create_platform_account('KWETU_REVENUE',    'Kwetu Revenue');
$vat  = get_or_create_platform_account('KWETU_VAT_PAYABLE','Kwetu VAT Payable');
$amt  = (int)$quote['premiumMinor'];
$vatAmt = (int)round($amt * 0.16 / 1.16);
$netAmt = $amt - $vatAmt;

post_ledger_transaction($ikey, "Insurance: {$quote['productType']}", [
    ['accountId'=>$cash['id'],'direction'=>'DEBIT', 'amountMinor'=>$amt],
    ['accountId'=>$rev['id'], 'direction'=>'CREDIT','amountMinor'=>$netAmt],
    ['accountId'=>$vat['id'], 'direction'=>'CREDIT','amountMinor'=>$vatAmt],
]);

$policyId = cuid();
$pdo->prepare('INSERT INTO "InsurancePolicy" (id, "userId", "quoteId", status, "paymentId", "createdAt") VALUES (?,?,?,\'BOUND\',?,NOW())')
    ->execute([$policyId, $user['id'], $quoteId, $paymentId]);

json_out(['policyId'=>$policyId,'status'=>'BOUND'], 201);
