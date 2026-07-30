<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/money.php';

if (!method_is('POST')) { json_out(['error'=>'Method not allowed'], 405); }

$data    = body();
$message = trim($data['message'] ?? '');
if (!$message) { json_out(['error'=>'message required'], 400); }

$pdo = db();

// Simple rule-based chatbot
$msg = strtolower($message);
$reply = '';

if (str_contains($msg, 'bus') || str_contains($msg, 'ticket') || str_contains($msg, 'trip')) {
    $next = $pdo->query('SELECT t.*, r.origin, r.destination FROM "Trip" t JOIN "Route" r ON r.id = t."routeId" WHERE t."departAt" > NOW() ORDER BY t."departAt" ASC LIMIT 3')->fetchAll();
    if ($next) {
        $lines = array_map(fn($t) => "• {$t['origin']}→{$t['destination']} " . date('D d M H:i', strtotime($t['departAt'])) . ' ZMW ' . number_format((int)$t['basePriceMinor']/100, 2), $next);
        $reply = "Upcoming trips:\n" . implode("\n", $lines) . "\n\nSearch more at /bus";
    } else {
        $reply = "I couldn't find upcoming trips. Visit /bus to search.";
    }
} elseif (str_contains($msg, 'hotel') || str_contains($msg, 'stay') || str_contains($msg, 'room') || str_contains($msg, 'accommodation')) {
    $reply = "Browse hotels and guesthouses at /stays — search by city, check-in and check-out date.";
} elseif (str_contains($msg, 'event')) {
    $reply = "See all upcoming events at /events — concerts, festivals, conferences and more.";
} elseif (str_contains($msg, 'insurance')) {
    $reply = "Get an instant insurance quote at /insurance — travel, motor, health, home and life products.";
} elseif (str_contains($msg, 'land') || str_contains($msg, 'plot') || str_contains($msg, 'property')) {
    $reply = "Browse land listings at /land and rental properties at /rentals.";
} elseif (str_contains($msg, 'balance') || str_contains($msg, 'wallet') || str_contains($msg, 'points') || str_contains($msg, 'loyalty')) {
    $reply = "Check your wallet balance and loyalty points on your /dashboard after logging in.";
} elseif (str_contains($msg, 'refund') || str_contains($msg, 'cancel')) {
    $reply = "For refund requests, please contact our support team or visit /dashboard — refunds are processed within 2-5 business days.";
} elseif (str_contains($msg, 'ussd') || str_contains($msg, '*800')) {
    $reply = "Dial *800# on any Zambia mobile network to access Kwetu without a smartphone. Works on Airtel, MTN and Zamtel.";
} elseif (str_contains($msg, 'hello') || str_contains($msg, 'hi') || str_contains($msg, 'hey')) {
    $reply = "Hello! I'm Kwetu's virtual assistant. I can help you with bus tickets, stays, events, insurance, land, rentals and more. What can I help you with?";
} else {
    $reply = "I'm here to help with bus tickets, stays, events, insurance, land, rentals and your wallet. What would you like to know?";
}

json_out(['reply'=>$reply]);
