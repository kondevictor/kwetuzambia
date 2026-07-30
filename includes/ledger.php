<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

const ACCOUNT_TYPES = [
    'USER_WALLET'      => 'USER_WALLET',
    'SUPPLIER_PAYABLE' => 'SUPPLIER_PAYABLE',
    'KWETU_REVENUE'    => 'KWETU_REVENUE',
    'KWETU_VAT_PAYABLE'=> 'KWETU_VAT_PAYABLE',
    'INSURER_PAYABLE'  => 'INSURER_PAYABLE',
    'REFERRAL_PAYABLE' => 'REFERRAL_PAYABLE',
    'CASH_CLEARING'    => 'CASH_CLEARING',
];

function get_or_create_platform_account(string $type, string $name): array {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM "LedgerAccount" WHERE type = ? AND "userId" IS NULL LIMIT 1');
    $stmt->execute([$type]);
    $acc = $stmt->fetch();
    if ($acc) return $acc;

    $id = cuid();
    $pdo->prepare('INSERT INTO "LedgerAccount" (id, type, name, "userId", "createdAt") VALUES (?,?,?,NULL,NOW())')
        ->execute([$id, $type, $name]);
    return ['id' => $id, 'type' => $type, 'name' => $name, 'userId' => null];
}

function post_ledger_transaction(string $idempotency_key, string $description, array $lines): array {
    $pdo = db();

    $stmt = $pdo->prepare('SELECT id FROM "LedgerTransaction" WHERE "idempotencyKey" = ?');
    $stmt->execute([$idempotency_key]);
    $existing = $stmt->fetchColumn();
    if ($existing) return ['id' => $existing];

    if (count($lines) < 2) throw new RuntimeException('Ledger transaction needs at least two lines');

    $debits  = array_sum(array_column(array_filter($lines, fn($l) => $l['direction'] === 'DEBIT'),  'amountMinor'));
    $credits = array_sum(array_column(array_filter($lines, fn($l) => $l['direction'] === 'CREDIT'), 'amountMinor'));
    if ($debits !== $credits) throw new RuntimeException("Unbalanced ledger: debits=$debits credits=$credits");

    $tx_id = cuid();
    $pdo->prepare('INSERT INTO "LedgerTransaction" (id, "idempotencyKey", description, "createdAt") VALUES (?,?,?,NOW())')
        ->execute([$tx_id, $idempotency_key, $description]);

    $asset_types = ['CASH_CLEARING', 'USER_WALLET'];

    foreach ($lines as $line) {
        if ($line['amountMinor'] <= 0) continue;

        $acc = $pdo->prepare('SELECT type FROM "LedgerAccount" WHERE id = ?');
        $acc->execute([$line['accountId']]);
        $acc_type = $acc->fetchColumn();

        $is_asset = in_array($acc_type, $asset_types);
        $last = $pdo->prepare('SELECT "runningBalance" FROM "LedgerEntry" WHERE "accountId" = ? ORDER BY "createdAt" DESC LIMIT 1');
        $last->execute([$line['accountId']]);
        $prior = (int)($last->fetchColumn() ?? 0);

        if ($line['direction'] === 'DEBIT') {
            $delta = $is_asset ? $line['amountMinor'] : -$line['amountMinor'];
        } else {
            $delta = $is_asset ? -$line['amountMinor'] : $line['amountMinor'];
        }
        $running = $prior + $delta;

        $entry_id = cuid();
        $pdo->prepare('INSERT INTO "LedgerEntry" (id, "transactionId", "accountId", direction, "amountMinor", "runningBalance", "createdAt") VALUES (?,?,?,?,?,?,NOW())')
            ->execute([$entry_id, $tx_id, $line['accountId'], $line['direction'], $line['amountMinor'], $running]);
    }

    return ['id' => $tx_id];
}

function transaction_balances(array $entries): bool {
    $debits  = array_sum(array_column(array_filter($entries, fn($e) => $e['direction'] === 'DEBIT'),  'amountMinor'));
    $credits = array_sum(array_column(array_filter($entries, fn($e) => $e['direction'] === 'CREDIT'), 'amountMinor'));
    return $debits === $credits;
}
