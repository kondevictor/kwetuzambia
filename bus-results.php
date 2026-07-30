<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';

$origin      = trim($_GET['origin'] ?? '');
$destination = trim($_GET['destination'] ?? '');

$pdo  = db();
$stmt = $pdo->prepare('
    SELECT t.id, t."departAt", t."arriveAt", t."basePriceMinor", t."totalSeats",
           r.origin, r.destination,
           o.name AS operator_name, o.verified AS operator_verified,
           COUNT(s.id) FILTER (WHERE s.status = \'AVAILABLE\') AS available_seats
    FROM "Trip" t
    JOIN "Route" r ON r.id = t."routeId"
    JOIN "Operator" o ON o.id = r."operatorId"
    LEFT JOIN "Seat" s ON s."tripId" = t.id
    WHERE r.origin ILIKE ? AND r.destination ILIKE ?
    GROUP BY t.id, r.origin, r.destination, o.name, o.verified
    ORDER BY t."departAt" ASC
');
$stmt->execute(["%$origin%", "%$destination%"]);
$results = $stmt->fetchAll();

html_head("$origin → $destination — Kwetu");
?>
<div class="mx-auto max-w-3xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]"><?= htmlspecialchars($origin) ?> → <?= htmlspecialchars($destination) ?></h1>
  <?php if (empty($results)): ?>
    <p class="mt-6 text-slate-500">No trips found.</p>
  <?php endif; ?>
  <div class="mt-6 space-y-4">
    <?php foreach ($results as $r):
      $bd = compute_commission_on_top('BUS', (int)$r['basePriceMinor']);
    ?>
    <a href="/bus/<?= $r['id'] ?>" class="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <div class="font-semibold flex items-center gap-2">
            <?= htmlspecialchars($r['operator_name']) ?>
            <?php if ($r['operator_verified']): ?><span class="badge">✓ Verified</span><?php endif; ?>
          </div>
          <div class="text-sm text-slate-500"><?= date('D d M, H:i', strtotime($r['departAt'])) ?></div>
          <div class="text-sm text-slate-500"><?= (int)$r['available_seats'] ?> seats left</div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-[#0B5D3B]"><?= format_zmw($bd['totalAmountMinor']) ?></div>
          <div class="text-xs text-slate-400">fare <?= format_zmw($bd['baseAmountMinor']) ?> + fee <?= format_zmw($bd['commissionAmountMinor']) ?> + VAT <?= format_zmw($bd['vatAmountMinor']) ?></div>
        </div>
      </div>
    </a>
    <?php endforeach; ?>
  </div>
</div>
<?php html_foot(); ?>
