<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/pricing.php';

$city    = trim($_GET['city'] ?? '');
$checkin = trim($_GET['checkin'] ?? '');
$checkout= trim($_GET['checkout'] ?? '');
$guests  = max(1, (int)($_GET['guests'] ?? 1));

$pdo = db();
$properties = [];
if ($city) {
    $nights = ($checkin && $checkout) ? max(1, (int)((strtotime($checkout) - strtotime($checkin)) / 86400)) : 1;
    $stmt = $pdo->prepare('
        SELECT p.id, p.name, p.description, p.city,
               MIN(r."ratePerNightMinor") AS min_price
        FROM "Property" p
        JOIN "Room" r ON r."propertyId" = p.id
        WHERE p.city ILIKE ?
        GROUP BY p.id, p.name, p.description, p.city
        ORDER BY min_price ASC
    ');
    $stmt->execute(["%$city%"]);
    $properties = $stmt->fetchAll();
}

html_head('Stays — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Find a place to stay</h1>
  <form method="GET" class="bg-white rounded-xl shadow-sm border p-5 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
    <div class="col-span-2 sm:col-span-1">
      <label class="text-sm font-medium">City</label>
      <input class="input mt-1" name="city" value="<?= htmlspecialchars($city) ?>" placeholder="Lusaka" required>
    </div>
    <div>
      <label class="text-sm font-medium">Check-in</label>
      <input class="input mt-1" name="checkin" type="date" value="<?= htmlspecialchars($checkin) ?>">
    </div>
    <div>
      <label class="text-sm font-medium">Check-out</label>
      <input class="input mt-1" name="checkout" type="date" value="<?= htmlspecialchars($checkout) ?>">
    </div>
    <button class="btn-primary">Search</button>
  </form>

  <?php if ($city && empty($properties)): ?>
    <p class="mt-8 text-slate-500">No properties found in <?= htmlspecialchars($city) ?>.</p>
  <?php endif; ?>

  <div class="mt-8 grid sm:grid-cols-2 gap-6">
    <?php foreach ($properties as $p):
      $bd = compute_commission_on_top('ACCOMMODATION', (int)($p['min_price'] ?? 0));
    ?>
    <a href="/stays/<?= $p['id'] ?>" class="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow block">
      <div class="h-44 bg-slate-100 flex items-center justify-center text-4xl">🏨</div>
      <div class="p-4">
        <div class="font-semibold"><?= htmlspecialchars($p['name']) ?></div>
        <div class="text-sm text-slate-500"><?= htmlspecialchars($p['city']) ?></div>
        <div class="text-[#0B5D3B] font-bold mt-2"><?= format_zmw($bd['totalAmountMinor']) ?> <span class="font-normal text-slate-400 text-xs">/ night</span></div>
      </div>
    </a>
    <?php endforeach; ?>
  </div>
</div>
<?php html_foot(); ?>
