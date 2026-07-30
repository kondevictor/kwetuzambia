<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';

$pdo = db();
$stmt = $pdo->query('SELECT e.*, COUNT(tt.id) AS tier_count FROM "Event" e LEFT JOIN "TicketTier" tt ON tt."eventId" = e.id WHERE e.status = \'PUBLISHED\' AND e."startAt" >= NOW() GROUP BY e.id ORDER BY e."startAt" ASC LIMIT 50');
$events = $stmt->fetchAll();

html_head('Events — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Upcoming events in Zambia</h1>

  <?php if (empty($events)): ?>
  <p class="mt-8 text-slate-500">No upcoming events — check back soon.</p>
  <?php endif; ?>

  <div class="mt-6 grid sm:grid-cols-2 gap-6">
    <?php foreach ($events as $ev):
      $imgs = json_decode($ev['images'] ?? '[]', true);
      $img = $imgs[0] ?? '';
      $tiers = $pdo->prepare('SELECT * FROM "TicketTier" WHERE "eventId" = ? ORDER BY "basePriceMinor" ASC');
      $tiers->execute([$ev['id']]);
      $tiers = $tiers->fetchAll();
      $cheapest = $tiers[0] ?? null;
      $bd = $cheapest ? compute_commission_on_top('EVENT', (int)$cheapest['basePriceMinor']) : null;
    ?>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <?php if ($img): ?>
      <div class="h-40 bg-cover bg-center" style="background-image:url('<?= htmlspecialchars($img) ?>')"></div>
      <?php else: ?>
      <div class="h-40 bg-slate-100 flex items-center justify-center text-4xl">🎫</div>
      <?php endif; ?>
      <div class="p-4">
        <div class="font-semibold"><?= htmlspecialchars($ev['name']) ?></div>
        <div class="text-sm text-slate-500"><?= date('D d M Y, H:i', strtotime($ev['startAt'])) ?> · <?= htmlspecialchars($ev['venue']) ?></div>
        <?php if ($bd): ?>
        <div class="text-[#0B5D3B] font-bold mt-2">From <?= format_zmw($bd['totalAmountMinor']) ?></div>
        <?php endif; ?>
        <div class="mt-3 space-y-2">
          <?php foreach ($tiers as $t):
            $tbd = compute_commission_on_top('EVENT', (int)$t['basePriceMinor']);
          ?>
          <div class="flex justify-between items-center border rounded-lg px-3 py-2 text-sm">
            <div><?= htmlspecialchars($t['name']) ?> — <?= format_zmw($tbd['totalAmountMinor']) ?></div>
            <button onclick="buyTicket('<?= $t['id'] ?>','<?= addslashes($t['name']) ?> @ <?= addslashes($ev['name']) ?>',<?= $tbd['totalAmountMinor'] ?>)" class="btn-primary text-xs py-1 px-3">Buy</button>
          </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
    <h2 class="font-bold" id="modal-title"></h2>
    <form onsubmit="doTicket(event)" class="mt-4 space-y-3">
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref" required>
      <div id="aerr" class="text-sm text-red-600 hidden"></div>
      <div class="flex gap-3">
        <button type="button" onclick="document.getElementById('modal').classList.add('hidden')" class="btn-outline flex-1">Cancel</button>
        <button class="btn-primary flex-1">Pay</button>
      </div>
    </form>
  </div>
</div>

<script>
let _tierId, _total;
function buyTicket(tierId, title, total) {
  _tierId=tierId; _total=total;
  document.getElementById('modal-title').textContent = title + ' — ZMW '+(total/100).toFixed(2);
  document.getElementById('modal').classList.remove('hidden');
}
async function doTicket(e) {
  e.preventDefault();
  document.getElementById('aerr').classList.add('hidden');
  const r = await fetch('/api/events/checkout.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketTierId:_tierId,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})});
  const d = await r.json();
  if (!r.ok){document.getElementById('aerr').textContent=d.error||'Failed';document.getElementById('aerr').classList.remove('hidden');return;}
  window.location.href='/dashboard';
}
</script>
<?php html_foot(); ?>
