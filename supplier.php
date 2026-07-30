<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/auth.php';

$user = require_auth();
if (!in_array($user['role'], ['SUPPLIER','ADMIN'])) {
    http_response_code(403);
    echo '<p class="p-8 text-red-600">Access denied — supplier account required.</p>';
    html_foot(); exit;
}
$pdo = db();
$uid = $user['id'];

$sumStmt = $pdo->prepare('SELECT * FROM "SupplierSummary" WHERE "supplierId" = ?');
$sumStmt->execute([$uid]);
$summary = $sumStmt->fetch();

$routes = $pdo->prepare('SELECT r.*, o.name AS operator_name FROM "Route" r JOIN "Operator" o ON o.id = r."operatorId" WHERE o."ownerId" = ? ORDER BY r."createdAt" DESC LIMIT 20');
$routes->execute([$uid]);
$routes = $routes->fetchAll();

$payouts = $pdo->prepare('SELECT * FROM "Payout" WHERE "supplierId" = ? ORDER BY "createdAt" DESC LIMIT 10');
$payouts->execute([$uid]);
$payouts = $payouts->fetchAll();

html_head('Supplier dashboard — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Supplier dashboard</h1>

  <?php if ($summary): ?>
  <div class="grid sm:grid-cols-3 gap-4 mt-6">
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Revenue (30 days)</div><div class="text-2xl font-bold text-[#0B5D3B]"><?= format_zmw((int)($summary['revenue30dMinor'] ?? 0)) ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Bookings (30 days)</div><div class="text-2xl font-bold"><?= (int)($summary['bookings30d'] ?? 0) ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Pending payout</div><div class="text-2xl font-bold text-amber-600"><?= format_zmw((int)($summary['pendingPayoutMinor'] ?? 0)) ?></div></div>
  </div>
  <?php endif; ?>

  <div class="mt-8">
    <div class="flex justify-between items-center">
      <h2 class="font-semibold">Routes &amp; trips</h2>
      <button onclick="document.getElementById('add-route').classList.toggle('hidden')" class="btn-primary text-sm py-1 px-3">+ Add route</button>
    </div>
    <form id="add-route" class="hidden bg-white rounded-xl border p-5 mt-3 space-y-3" onsubmit="addRoute(event)">
      <div class="grid sm:grid-cols-2 gap-3">
        <input class="input" id="origin" placeholder="Origin (e.g. Lusaka)" required>
        <input class="input" id="dest" placeholder="Destination" required>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <input class="input" id="depart" type="datetime-local" required placeholder="Depart at">
        <input class="input" id="price" type="number" placeholder="Base price (ZMW)" required>
      </div>
      <input class="input" id="plate" placeholder="Bus plate e.g. ABD 1234 ZM" required>
      <input class="input" id="seats" type="number" value="50" placeholder="Total seats" required>
      <div id="rerr" class="text-sm text-red-600 hidden"></div>
      <button class="btn-primary w-full">Add trip</button>
    </form>
    <div class="mt-3 space-y-2">
      <?php foreach ($routes as $r): ?>
      <div class="bg-white rounded-xl border px-5 py-3 text-sm flex justify-between">
        <span><?= htmlspecialchars($r['origin']) ?> → <?= htmlspecialchars($r['destination']) ?></span>
        <span class="text-slate-400"><?= htmlspecialchars($r['operator_name']) ?></span>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="font-semibold">Payouts</h2>
    <div class="mt-2 space-y-2">
      <?php if (empty($payouts)): ?><p class="text-sm text-slate-400">No payouts yet.</p><?php endif; ?>
      <?php foreach ($payouts as $p): ?>
      <div class="bg-white rounded-xl border px-5 py-3 flex justify-between text-sm">
        <span><?= date('d M Y', strtotime($p['createdAt'])) ?> — <?= $p['status'] ?></span>
        <span class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$p['amountMinor']) ?></span>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<script>
async function addRoute(e) {
  e.preventDefault();
  document.getElementById('rerr').classList.add('hidden');
  const r = await fetch('/api/supplier/bus.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:document.getElementById('origin').value,destination:document.getElementById('dest').value,departAt:document.getElementById('depart').value,basePriceZmw:parseFloat(document.getElementById('price').value),busPlate:document.getElementById('plate').value,totalSeats:parseInt(document.getElementById('seats').value)})});
  const d = await r.json();
  if (!r.ok){document.getElementById('rerr').textContent=d.error||'Failed';document.getElementById('rerr').classList.remove('hidden');return;}
  location.reload();
}
</script>
<?php html_foot(); ?>
