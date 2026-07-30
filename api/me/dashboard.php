<?php
require_once __DIR__ . '/../../includes/db.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/money.php';
require_once __DIR__ . '/../../includes/loyalty.php';

$user = require_auth();
$pdo  = db();
$uid  = $user['id'];

$wallet = $pdo->prepare('SELECT * FROM "Wallet" WHERE "userId" = ?');
$wallet->execute([$uid]);
$wallet = $wallet->fetch() ?: ['balanceMinor'=>0,'loyaltyPoints'=>0,'completedBookingsCount'=>0];

$tier = loyalty_tier_for((int)$wallet['loyaltyPoints']);
$next = points_to_next_tier((int)$wallet['loyaltyPoints']);

json_out([
    'user'   => ['id'=>$user['id'],'name'=>$user['name'],'email'=>$user['email'],'role'=>$user['role']],
    'wallet' => ['balanceMinor'=>(int)$wallet['balanceMinor'],'loyaltyPoints'=>(int)$wallet['loyaltyPoints'],'completedBookingsCount'=>(int)$wallet['completedBookingsCount']],
    'loyalty'=> ['tier'=>$tier,'next'=>$next],
]);
