<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/money.php';

$id  = $_GET['id'] ?? '';
$pdo = db();
$stmt = $pdo->prepare('
    SELECT b.*, t."departAt", r.origin, r.destination, o.name AS operator_name, b."passengerName", b."totalMinor", b."feeWaived"
    FROM "BusBooking" b
    JOIN "Trip" t ON t.id = b."tripId"
    JOIN "Route" r ON r.id = t."routeId"
    JOIN "Operator" o ON o.id = r."operatorId"
    WHERE b.id = ?
');
$stmt->execute([$id]);
$booking = $stmt->fetch();

$seats_stmt = $pdo->prepare('SELECT "seatNo" FROM "Seat" WHERE "bookingId" = ?');
$seats_stmt->execute([$id]);
$seat_nos = array_column($seats_stmt->fetchAll(), 'seatNo');

html_head('Booking confirmation — Kwetu');
$confirmed = $booking && $booking['status'] === 'CONFIRMED';
?>
<div class="mx-auto max-w-lg px-4 py-12">
  <div class="bg-white rounded-xl shadow-sm border p-5 text-center">
    <div class="text-4xl"><?= $confirmed ? '✅' : '⚠️' ?></div>
    <h1 class="text-xl font-bold mt-2"><?= $confirmed ? 'Booking confirmed!' : 'Booking not completed' ?></h1>
    <p class="text-slate-500 mt-1">Reference: <?= htmlspecialchars($id) ?></p>
    <?php if ($booking): ?>
    <div class="mt-4 text-left text-sm space-y-1">
      <div><strong>Route:</strong> <?= htmlspecialchars($booking['origin']) ?> → <?= htmlspecialchars($booking['destination']) ?></div>
      <div><strong>Operator:</strong> <?= htmlspecialchars($booking['operator_name']) ?></div>
      <div><strong>Departs:</strong> <?= date('D d M Y, H:i', strtotime($booking['departAt'])) ?></div>
      <div><strong>Passenger:</strong> <?= htmlspecialchars($booking['passengerName']) ?></div>
      <div><strong>Seats:</strong> <?= htmlspecialchars(implode(', ', $seat_nos)) ?></div>
      <div><strong>Total paid:</strong> <?= format_zmw((int)$booking['totalMinor']) ?></div>
      <?php if ($booking['feeWaived']): ?>
      <div class="text-[#0B5D3B] font-medium">🎉 Loyalty reward: service fee waived on this booking!</div>
      <?php endif; ?>
    </div>
    <?php endif; ?>
  </div>
</div>
<?php html_foot(); ?>
