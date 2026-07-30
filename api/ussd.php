<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/money.php';

// Africa's Talking USSD callback
$sessionId   = $_POST['sessionId']   ?? '';
$serviceCode = $_POST['serviceCode'] ?? '';
$phoneNumber = $_POST['phoneNumber'] ?? '';
$text        = $_POST['text']        ?? '';

$pdo   = db();
$parts = explode('*', $text);
$level = count($parts);
$last  = end($parts);

if ($text === '') {
    // Initial menu
    echo "CON Welcome to Kwetu\n1. Bus tickets\n2. Check balance\n3. My bookings\n4. Contact support";
    exit;
}

if ($level === 1) {
    switch ($last) {
        case '1':
            echo "CON Bus Tickets\n1. Search trips\n2. My bus bookings\n0. Back";
            break;
        case '2':
            // Look up wallet
            $user = $pdo->prepare('SELECT u.id FROM "User" u WHERE u.phone = ?');
            $user->execute([$phoneNumber]);
            $user = $user->fetch();
            if ($user) {
                $w = $pdo->prepare('SELECT "balanceMinor","loyaltyPoints" FROM "Wallet" WHERE "userId" = ?');
                $w->execute([$user['id']]);
                $w = $w->fetch() ?: ['balanceMinor'=>0,'loyaltyPoints'=>0];
                echo "END Your Kwetu wallet\nBalance: " . format_zmw((int)$w['balanceMinor']) . "\nLoyalty points: " . (int)$w['loyaltyPoints'];
            } else {
                echo "END No account found for this number. Register at kwetu.co.zm";
            }
            break;
        case '3':
            echo "CON My Bookings\n1. Bus bookings\n0. Back";
            break;
        case '4':
            echo "END Contact Kwetu support:\nPhone: +260 97 1234567\nEmail: support@kwetu.co.zm\nWhatsApp: +260 97 1234567";
            break;
        default:
            echo "END Invalid option. Dial *800# to start again.";
    }
    exit;
}

if ($level === 2) {
    $menu   = $parts[0];
    $choice = $parts[1];
    if ($menu === '1') {
        if ($choice === '1') {
            $trips = $pdo->query('SELECT t.*, r.origin, r.destination FROM "Trip" t JOIN "Route" r ON r.id = t."routeId" WHERE t."departAt" > NOW() ORDER BY t."departAt" ASC LIMIT 3')->fetchAll();
            if ($trips) {
                $lines = "CON Next departures:\n";
                foreach ($trips as $i => $t) {
                    $lines .= ($i+1) . ". {$t['origin']}→{$t['destination']} " . date('d/m H:i', strtotime($t['departAt'])) . "\n";
                }
                echo $lines . "0. Back";
            } else {
                echo "END No upcoming trips found. Visit kwetu.co.zm for more.";
            }
        } elseif ($choice === '0') {
            echo "CON Welcome to Kwetu\n1. Bus tickets\n2. Check balance\n3. My bookings\n4. Contact support";
        } else {
            echo "END Invalid option.";
        }
    }
    exit;
}

echo "END Thank you for using Kwetu. Visit kwetu.co.zm";
