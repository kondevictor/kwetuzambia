<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/ledger.php';

require_admin();
$pdo = db();

// Find all ledger transactions in last 30 days
$txns = $pdo->query('SELECT lt.id, lt.description, SUM(CASE WHEN le.type = \'CREDIT\' THEN le."amountMinor" ELSE -le."amountMinor" END) AS net FROM "LedgerTransaction" lt JOIN "LedgerEntry" le ON le."transactionId" = lt.id WHERE lt."createdAt" > NOW() - INTERVAL \'30 days\' GROUP BY lt.id, lt.description HAVING SUM(CASE WHEN le.type = \'CREDIT\' THEN le."amountMinor" ELSE -le."amountMinor" END) != 0 LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);

$imbalanced = array_filter($txns, fn($t) => (int)$t['net'] !== 0);

$total_commission = $pdo->query('SELECT COALESCE(SUM("commissionAmountMinor"),0) FROM "CommissionRecord" WHERE "createdAt" > NOW() - INTERVAL \'30 days\'')->fetchColumn();
$total_revenue    = $pdo->query('SELECT COALESCE(SUM("amountMinor"),0) FROM "Payment" WHERE status = \'SUCCEEDED\' AND "createdAt" > NOW() - INTERVAL \'30 days\'')->fetchColumn();

json_out([
    'period'            => '30d',
    'total_revenue'     => (int)$total_revenue,
    'total_commission'  => (int)$total_commission,
    'imbalanced_count'  => count($imbalanced),
    'imbalanced_txns'   => array_values($imbalanced),
]);
