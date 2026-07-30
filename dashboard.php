<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/loyalty.php';

$user = require_auth();
$pdo  = db();
$uid  = $user['id'];

$wallet = $pdo->prepare('SELECT * FROM "Wallet" WHERE "userId" = ?');
$wallet->execute([$uid]);
$wallet = $wallet->fetch() ?: ['balanceMinor'=>0,'loyaltyPoints'=>0,'completedBookingsCount'=>0];

$bus = $pdo->prepare('SELECT b.*, r.origin, r.destination FROM "BusBooking" b JOIN "Trip" t ON t.id = b."tripId" JOIN "Route" r ON r.id = t."routeId" WHERE b."userId" = ? ORDER BY b."createdAt" DESC LIMIT 10');
$bus->execute([$uid]); $bus = $bus->fetchAll();

$stays = $pdo->prepare('SELECT b.*, p.name AS property_name FROM "StayBooking" b JOIN "Room" rm ON rm.id = b."roomId" JOIN "Property" p ON p.id = rm."propertyId" WHERE b."userId" = ? ORDER BY b."createdAt" DESC LIMIT 10');
$stays->execute([$uid]); $stays = $stays->fetchAll();

$events = $pdo->prepare('SELECT t.*, e.name AS event_name FROM "EventTicket" t JOIN "TicketTier" tt ON tt.id = t."ticketTierId" JOIN "Event" e ON e.id = tt."eventId" WHERE t."userId" = ? ORDER BY t."createdAt" DESC LIMIT 10');
$events->execute([$uid]); $events = $events->fetchAll();

$svcs = $pdo->prepare('SELECT b.*, sl.title FROM "ServiceBooking" b JOIN "ServiceListing" sl ON sl.id = b."listingId" WHERE b."userId" = ? ORDER BY b."createdAt" DESC LIMIT 10');
$svcs->execute([$uid]); $svcs = $svcs->fetchAll();

$pols = $pdo->prepare('SELECT p.*, q."productType", q."premiumMinor" FROM "InsurancePolicy" p JOIN "InsuranceQuote" q ON q.id = p."quoteId" WHERE p."userId" = ? ORDER BY p."createdAt" DESC LIMIT 10');

$pols->execute([$uid]); $pols = $pols->fetchAll();

$tier = loyalty_tier_for((int)$wallet['loyaltyPoints']);
$next = points_to_next_tier((int)$wallet['loyaltyPoints']);
$until = (int)$wallet['completedBookingsCount'] % 5;
$until_reward = $until === 0 ? 5 : 5 - $until;

html_head('Dashboard — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Hi <?= htmlspecialchars(explode(' ', $user['name'])[0]) ?></h1>

  <div class="grid sm:grid-cols-4 gap-4 mt-6">
    <?php
    $tier_color = $tier === 'Gold' ? 'text-amber-500' : ($tier === 'Silver' ? 'text-slate-400' : 'text-amber-700');
    ?>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Wallet balance</div><div class="text-2xl font-bold text-[#0B5D3B]"><?= format_zmw((int)$wallet['balanceMinor']) ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Loyalty points (K-Cash)</div><div class="text-2xl font-bold text-[#E8792B]"><?= (int)$wallet['loyaltyPoints'] ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Loyalty tier</div><div class="text-2xl font-bold <?= $tier_color ?>"><?= $tier ?></div><?php if ($next): ?><div class="text-xs text-slate-400"><?= $next['pointsNeeded'] ?> pts to <?= $next['nextTier'] ?></div><?php endif; ?></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Bookings until next fee waiver</div><div class="text-2xl font-bold"><?= $until_reward ?></div><div class="text-xs text-slate-400">Every 5th booking fee is waived</div></div>
  </div>

  <?php function booking_section(string $title, array $rows, callable $render): void { ?>
  <div class="mt-8">
    <h2 class="font-semibold text-slate-700"><?= $title ?></h2>
    <div class="mt-2 space-y-2">
      <?php if (empty($rows)): ?><p class="text-sm text-slate-400">None yet.</p><?php endif; ?>
      <?php foreach ($rows as $r): $render($r); endforeach; ?>
    </div>
  </div>
  <?php } ?>

  <?php booking_section('Bus bookings', $bus, function($b) { ?>
    <div class="bg-white rounded-xl shadow-sm border px-5 py-3 flex justify-between items-center">
      <div><div class="font-medium"><?= htmlspecialchars($b['origin']) ?> → <?= htmlspecialchars($b['destination']) ?></div><div class="text-xs text-slate-400"><?= $b['status'] ?></div></div>
      <div class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$b['totalMinor']) ?></div>
    </div>
  <?php }); ?>

  <?php booking_section('Stays', $stays, function($b) { ?>
    <div class="bg-white rounded-xl shadow-sm border px-5 py-3 flex justify-between items-center">
      <div><div class="font-medium"><?= htmlspecialchars($b['property_name']) ?></div><div class="text-xs text-slate-400"><?= $b['status'] ?></div></div>
      <div class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$b['totalMinor']) ?></div>
    </div>
  <?php }); ?>

  <?php booking_section('Event tickets', $events, function($t) { ?>
    <div class="bg-white rounded-xl shadow-sm border px-5 py-3 flex justify-between items-center">
      <div><div class="font-medium"><?= htmlspecialchars($t['event_name']) ?></div><div class="text-xs text-slate-400"><?= $t['qrCode'] ?></div></div>
      <div class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$t['totalMinor']) ?></div>
    </div>
  <?php }); ?>

  <?php booking_section('Service bookings', $svcs, function($b) { ?>
    <div class="bg-white rounded-xl shadow-sm border px-5 py-3 flex justify-between items-center">
      <div><div class="font-medium"><?= htmlspecialchars($b['title']) ?></div><div class="text-xs text-slate-400"><?= $b['status'] ?></div></div>
      <div class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$b['totalMinor']) ?></div>
    </div>
  <?php }); ?>

  <?php booking_section('Insurance policies', $pols, function($p) { ?>
    <div class="bg-white rounded-xl shadow-sm border px-5 py-3 flex justify-between items-center">
      <div><div class="font-medium"><?= htmlspecialchars($p['productType']) ?></div><div class="text-xs text-slate-400"><?= $p['status'] ?></div></div>
      <div class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$p['premiumMinor']) ?></div>
    </div>
  <?php }); ?>
</div>
<?php html_foot(); ?>
