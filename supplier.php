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

$op = $pdo->prepare('SELECT * FROM "Operator" WHERE "ownerId" = ? LIMIT 1');
$op->execute([$uid]);
$op = $op->fetch();

$routes = [];
$commissions = [];
if ($op) {
    $rs = $pdo->prepare('SELECT r.*, COUNT(t.id) AS trips FROM "Route" r LEFT JOIN "Trip" t ON t."routeId" = r.id WHERE r."operatorId" = ? GROUP BY r.id ORDER BY r."createdAt" DESC LIMIT 20');
    $rs->execute([$op['id']]);
    $routes = $rs->fetchAll();

    $cs = $pdo->prepare('SELECT c.* FROM "Commission" c JOIN "Payment" p ON p.id = c."paymentId" WHERE p."createdAt" > NOW() - INTERVAL \'30 days\' ORDER BY p."createdAt" DESC LIMIT 20');
    $cs->execute();
    $commissions = $cs->fetchAll();
}

$revenue30d = $pdo->prepare('SELECT COALESCE(SUM(b."totalMinor"),0) FROM "BusBooking" b JOIN "Trip" t ON t.id = b."tripId" JOIN "Route" r ON r.id = t."routeId" WHERE r."operatorId" = ? AND b.status = \'CONFIRMED\' AND b."createdAt" > NOW() - INTERVAL \'30 days\'');
$revenue30d->execute([$op['id'] ?? '']);
$revenue30d = (int)$revenue30d->fetchColumn();

$bookings30d = $pdo->prepare('SELECT COUNT(*) FROM "BusBooking" b JOIN "Trip" t ON t.id = b."tripId" JOIN "Route" r ON r.id = t."routeId" WHERE r."operatorId" = ? AND b.status = \'CONFIRMED\' AND b."createdAt" > NOW() - INTERVAL \'30 days\'');
$bookings30d->execute([$op['id'] ?? '']);
$bookings30d = (int)$bookings30d->fetchColumn();

html_head('Supplier dashboard — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Supplier dashboard</h1>
  <?php if ($op && !$op['verified']): ?>
  <div class="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm">Your operator account is pending admin verification.</div>
  <?php endif; ?>

  <div class="grid sm:grid-cols-3 gap-4 mt-6">
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Revenue (30 days)</div><div class="text-2xl font-bold text-[#0B5D3B]"><?= format_zmw($revenue30d) ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Bookings (30 days)</div><div class="text-2xl font-bold"><?= $bookings30d ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Operator status</div><div class="text-2xl font-bold <?= ($op && $op['verified']) ? 'text-[#0B5D3B]' : 'text-amber-600' ?>"><?= $op ? ($op['verified'] ? 'Verified' : 'Pending') : 'No operator' ?></div></div>
  </div>

  <div class="mt-8">
    <div class="flex justify-between items-center">
      <h2 class="font-semibold">Routes &amp; trips</h2>
      <button onclick="document.getElementById('add-route').classList.toggle('hidden')" class="btn-primary text-sm py-1 px-3">+ Add trip</button>
    </div>
    <form id="add-route" class="hidden bg-white rounded-xl border p-5 mt-3 space-y-3" onsubmit="addRoute(event)">
      <div class="grid sm:grid-cols-2 gap-3">
        <input class="input" id="origin" placeholder="Origin (e.g. Lusaka)" required>
        <input class="input" id="dest" placeholder="Destination" required>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <input class="input" id="depart" type="datetime-local" required>
        <input class="input" id="price" type="number" step="0.01" placeholder="Base price (ZMW)" required>
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
        <span class="text-slate-400"><?= (int)$r['trips'] ?> trip(s)</span>
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
