<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/pricing.php';
require_once __DIR__ . '/payments.php';
require_once __DIR__ . '/ledger.php';

function run_checkout(
    string $user_id,
    string $vertical,
    int    $base_minor,
    string $method,
    string $msisdn_or_card,
    string $idempotency_key,
    string $description
): array {
    $pdo = db();

    // Upsert wallet
    $w = $pdo->prepare('SELECT * FROM "Wallet" WHERE "userId" = ?');
    $w->execute([$user_id]);
    $wallet = $w->fetch();
    if (!$wallet) {
        $wid = cuid();
        $pdo->prepare('INSERT INTO "Wallet" (id, "userId", "balanceMinor", "loyaltyPoints", "completedBookingsCount", "updatedAt") VALUES (?,?,0,0,0,NOW())')
            ->execute([$wid, $user_id]);
        $wallet = ['id' => $wid, 'completedBookingsCount' => 0, 'loyaltyPoints' => 0];
    }

    $fee_waived = is_loyalty_fee_waiver((int)$wallet['completedBookingsCount']);
    $breakdown  = compute_commission_on_top($vertical, $base_minor);
    $charge     = $fee_waived ? $base_minor : $breakdown['totalAmountMinor'];

    $charge_result = mock_charge((string)$charge, $method, $msisdn_or_card, $idempotency_key);

    $payment_id = cuid();
    $pdo->prepare('INSERT INTO "Payment" (id, "idempotencyKey", provider, method, status, "amountMinor", reference, "createdAt") VALUES (?,?,?,?,?,?,?,NOW())')
        ->execute([$payment_id, $idempotency_key, 'MockMoneyProvider', $method, $charge_result['status'], $charge, $charge_result['reference']]);

    $comm_id = cuid();
    $pdo->prepare('INSERT INTO "Commission" (id, "paymentId", vertical, "baseAmountMinor", "commissionAmountMinor", "vatAmountMinor", "totalAmountMinor", "ratePct", "createdAt") VALUES (?,?,?,?,?,?,?,?,NOW())')
        ->execute([$comm_id, $payment_id, $vertical, $breakdown['baseAmountMinor'],
            $fee_waived ? 0 : $breakdown['commissionAmountMinor'],
            $fee_waived ? 0 : $breakdown['vatAmountMinor'],
            $charge, $breakdown['ratePct']]);

    if ($charge_result['status'] === 'SUCCEEDED') {
        $cash    = get_or_create_platform_account('CASH_CLEARING',    'Cash Clearing');
        $supp    = get_or_create_platform_account('SUPPLIER_PAYABLE', 'Supplier Payable');
        $rev     = get_or_create_platform_account('KWETU_REVENUE',    'Kwetu Revenue');
        $vat_acc = get_or_create_platform_account('KWETU_VAT_PAYABLE','Kwetu VAT Payable');

        $lines = [
            ['accountId' => $cash['id'],  'direction' => 'DEBIT',  'amountMinor' => $charge],
            ['accountId' => $supp['id'],  'direction' => 'CREDIT', 'amountMinor' => $breakdown['baseAmountMinor']],
        ];
        if (!$fee_waived && $breakdown['commissionAmountMinor'] > 0) {
            $lines[] = ['accountId' => $rev['id'],     'direction' => 'CREDIT', 'amountMinor' => $breakdown['commissionAmountMinor']];
            $lines[] = ['accountId' => $vat_acc['id'], 'direction' => 'CREDIT', 'amountMinor' => $breakdown['vatAmountMinor']];
        }

        post_ledger_transaction($idempotency_key, $description, $lines);

        $pts = (int)floor($charge / 1000);
        $pdo->prepare('UPDATE "Wallet" SET "completedBookingsCount" = "completedBookingsCount" + 1, "loyaltyPoints" = "loyaltyPoints" + ?, "updatedAt" = NOW() WHERE "userId" = ?')
            ->execute([$pts, $user_id]);
    }

    return [
        'paymentId'  => $payment_id,
        'status'     => $charge_result['status'],
        'breakdown'  => $breakdown,
        'feeWaived'  => $fee_waived,
        'reference'  => $charge_result['reference'],
    ];
}

function run_placement_fee_checkout(
    string $user_id,
    int    $fee_minor,
    string $method,
    string $msisdn_or_card,
    string $idempotency_key,
    string $description
): array {
    $pdo = db();

    $charge_result = mock_charge((string)$fee_minor, $method, $msisdn_or_card, $idempotency_key);

    $payment_id = cuid();
    $pdo->prepare('INSERT INTO "Payment" (id, "idempotencyKey", provider, method, status, "amountMinor", reference, "createdAt") VALUES (?,?,?,?,?,?,?,NOW())')
        ->execute([$payment_id, $idempotency_key, 'MockMoneyProvider', $method, $charge_result['status'], $fee_minor, $charge_result['reference']]);

    if ($charge_result['status'] === 'SUCCEEDED') {
        $cash    = get_or_create_platform_account('CASH_CLEARING',    'Cash Clearing');
        $rev     = get_or_create_platform_account('KWETU_REVENUE',    'Kwetu Revenue');
        $vat_acc = get_or_create_platform_account('KWETU_VAT_PAYABLE','Kwetu VAT Payable');

        $vat_minor = (int)round(($fee_minor * 0.16) / 1.16);
        $net_minor = $fee_minor - $vat_minor;

        post_ledger_transaction($idempotency_key, $description, [
            ['accountId' => $cash['id'],    'direction' => 'DEBIT',  'amountMinor' => $fee_minor],
            ['accountId' => $rev['id'],     'direction' => 'CREDIT', 'amountMinor' => $net_minor],
            ['accountId' => $vat_acc['id'], 'direction' => 'CREDIT', 'amountMinor' => $vat_minor],
        ]);
    }

    return ['paymentId' => $payment_id, 'status' => $charge_result['status'], 'reference' => $charge_result['reference']];
}

function run_refund(string $payment_id, string $reason, string $idempotency_key): array {
    $pdo = db();

    $stmt = $pdo->prepare('SELECT p.*, c.* FROM "Payment" p LEFT JOIN "Commission" c ON c."paymentId" = p.id WHERE p.id = ?');
    $stmt->execute([$payment_id]);
    $payment = $stmt->fetch();

    if (!$payment) throw new RuntimeException('Payment not found');
    if ($payment['status'] !== 'SUCCEEDED') throw new RuntimeException('Only succeeded payments can be refunded');

    $refund_result = mock_refund($payment['reference'], $idempotency_key);

    $refund_id = cuid();
    $pdo->prepare('INSERT INTO "Refund" (id, "paymentId", "idempotencyKey", "amountMinor", reason, status, reference, "createdAt") VALUES (?,?,?,?,?,?,?,NOW())')
        ->execute([$refund_id, $payment_id, $idempotency_key, $payment['amountMinor'], $reason, $refund_result['status'], $refund_result['reference']]);

    if ($refund_result['status'] === 'SUCCEEDED') {
        $cash    = get_or_create_platform_account('CASH_CLEARING',    'Cash Clearing');
        $supp    = get_or_create_platform_account('SUPPLIER_PAYABLE', 'Supplier Payable');
        $rev     = get_or_create_platform_account('KWETU_REVENUE',    'Kwetu Revenue');
        $vat_acc = get_or_create_platform_account('KWETU_VAT_PAYABLE','Kwetu VAT Payable');

        $base = (int)($payment['baseAmountMinor'] ?? 0);
        $comm = (int)($payment['commissionAmountMinor'] ?? 0);
        $vat  = (int)($payment['vatAmountMinor'] ?? 0);

        if ($base > 0) {
            $lines = array_filter([
                $base > 0 ? ['accountId' => $supp['id'],    'direction' => 'DEBIT',  'amountMinor' => $base] : null,
                $comm > 0 ? ['accountId' => $rev['id'],     'direction' => 'DEBIT',  'amountMinor' => $comm] : null,
                $vat  > 0 ? ['accountId' => $vat_acc['id'], 'direction' => 'DEBIT',  'amountMinor' => $vat]  : null,
                ['accountId' => $cash['id'], 'direction' => 'CREDIT', 'amountMinor' => $payment['amountMinor']],
            ]);
        } else {
            $lines = [
                ['accountId' => $rev['id'],  'direction' => 'DEBIT',  'amountMinor' => $payment['amountMinor']],
                ['accountId' => $cash['id'], 'direction' => 'CREDIT', 'amountMinor' => $payment['amountMinor']],
            ];
        }

        post_ledger_transaction("refund-$idempotency_key", "Refund for payment $payment_id: $reason", array_values($lines));
    }

    return ['id' => $refund_id, 'status' => $refund_result['status'], 'reference' => $refund_result['reference']];
}
