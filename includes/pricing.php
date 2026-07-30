<?php
declare(strict_types=1);

const VAT_RATE = 0.16;

const COMMISSION_RATES = [
    'BUS'           => 0.07,
    'ACCOMMODATION' => 0.115,
    'EVENT'         => 0.075,
    'SERVICE'       => 0.085,
    'INSURANCE'     => 0.18,
    'REFERRAL'      => 0.04,
];

function compute_commission_on_top(string $vertical, int $base_minor): array {
    $rate       = COMMISSION_RATES[$vertical] ?? throw new RuntimeException("Unknown vertical: $vertical");
    $commission = (int) round($base_minor * $rate);
    $vat        = (int) round($commission * VAT_RATE);
    $total      = $base_minor + $commission + $vat;
    return [
        'vertical'              => $vertical,
        'baseAmountMinor'       => $base_minor,
        'ratePct'               => $rate,
        'commissionAmountMinor' => $commission,
        'vatAmountMinor'        => $vat,
        'totalAmountMinor'      => $total,
    ];
}

function placement_fee_for_rental(string $period): int {
    return match($period) {
        'DAYS_7'  => 5000,
        'DAYS_14' => 8500,
        'DAYS_30' => 15000,
        default   => throw new RuntimeException("Unknown period: $period"),
    };
}

function placement_fee_for_land(int $price_minor): int {
    $zmw = $price_minor / 100;
    if ($zmw < 50_000)  return 10000;
    if ($zmw < 200_000) return 25000;
    if ($zmw < 500_000) return 50000;
    return 100000;
}

function is_loyalty_fee_waiver(int $completed_count): bool {
    return ($completed_count + 1) % 5 === 0;
}
