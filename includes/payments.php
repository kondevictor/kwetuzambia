<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

function mock_charge(string $amount_minor, string $method, string $msisdn_or_card, string $idempotency_key): array {
    $fails = preg_replace('/\D/', '', $msisdn_or_card) === '0000000000';
    return [
        'status'    => $fails ? 'FAILED' : 'SUCCEEDED',
        'reference' => 'MOCK-' . strtoupper(substr(str_replace('-', '', uuid()), 0, 8)),
        'provider'  => 'MockMoneyProvider',
    ];
}

function mock_refund(string $original_ref, string $idempotency_key): array {
    return [
        'status'    => 'SUCCEEDED',
        'reference' => 'MOCK-RFD-' . strtoupper(substr(str_replace('-', '', uuid()), 0, 8)),
    ];
}
