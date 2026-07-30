<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/pricing.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$user = require_auth();
$data = body();

$productType    = $data['productType'] ?? '';
$sumMinor       = (int)($data['sumInsuredMinor'] ?? 0);
$months         = max(1, (int)($data['coverageMonths'] ?? 12));

$validTypes = ['TRAVEL','MOTOR','HEALTH','HOME','LIFE'];
if (!in_array($productType, $validTypes)) { json_out(['error'=>'Invalid product type'], 400); }
if ($sumMinor < 100000) { json_out(['error'=>'Sum insured must be at least ZMW 1,000'], 400); }

// Base premium rate per product type per year
$rates = ['TRAVEL'=>0.02,'MOTOR'=>0.04,'HEALTH'=>0.05,'HOME'=>0.015,'LIFE'=>0.01];
$rate  = $rates[$productType];
$annualBase = (int)($sumMinor * $rate);
$monthlyBase= (int)($annualBase / 12);
$totalBase  = (int)($monthlyBase * $months);

$bd = compute_commission_on_top('INSURANCE', $totalBase);

$pdo = db();
$quoteId = cuid();
$pdo->prepare('INSERT INTO "InsuranceQuote" (id, "userId", "productType", "sumInsuredMinor", "basePremiumMinor", "premiumMinor", "coverageMonths", "createdAt") VALUES (?,?,?,?,?,?,?,NOW())')
    ->execute([$quoteId, $user['id'], $productType, $sumMinor, $totalBase, $bd['totalAmountMinor'], $months]);

json_out([
    'quoteId'            => $quoteId,
    'productType'        => $productType,
    'sumInsuredMinor'    => $sumMinor,
    'monthlyPremiumMinor'=> $monthlyBase,
    'premiumMinor'       => $bd['totalAmountMinor'],
    'coverageMonths'     => $months,
], 201);
