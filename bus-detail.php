<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';

$trip_id = $_GET['id'] ?? '';
$pdo = db();

// Release stale holds
$pdo->prepare('UPDATE "Seat" SET status = \'AVAILABLE\', "heldUntil" = NULL WHERE "tripId" = ? AND status = \'HELD\' AND "heldUntil" < NOW()')
    ->execute([$trip_id]);

$stmt = $pdo->prepare('
    SELECT t.*, r.origin, r.destination, o.name AS operator_name, o.verified AS operator_verified
    FROM "Trip" t
    JOIN "Route" r ON r.id = t."routeId"
    JOIN "Operator" o ON o.id = r."operatorId"
    WHERE t.id = ?
');
$stmt->execute([$trip_id]);
$trip = $stmt->fetch();
if (!$trip) { header('Location: /bus'); exit; }

$seats = $pdo->prepare('SELECT id, "seatNo", status FROM "Seat" WHERE "tripId" = ? ORDER BY "seatNo" ASC');
$seats->execute([$trip_id]);
$seats = $seats->fetchAll();

$bd = compute_commission_on_top('BUS', (int)$trip['basePriceMinor']);
html_head("{$trip['origin']} → {$trip['destination']} — Kwetu");
?>
<div class="mx-auto max-w-4xl px-4 py-12 grid md:grid-cols-3 gap-8">
  <div class="md:col-span-2">
    <h1 class="text-2xl font-bold text-[#0B5D3B]"><?= htmlspecialchars($trip['origin']) ?> → <?= htmlspecialchars($trip['destination']) ?></h1>
    <p class="text-sm text-slate-500"><?= htmlspecialchars($trip['operator_name']) ?> · <?= htmlspecialchars($trip['busPlate']) ?> · <?= date('D d M, H:i', strtotime($trip['departAt'])) ?></p>

    <div id="seat-lost-msg" class="hidden mt-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2"></div>

    <div class="bg-white rounded-xl shadow-sm border p-5 mt-6">
      <div class="font-semibold mb-3 flex justify-between">
        <span>Select your seat(s)</span>
        <span class="text-xs font-normal text-slate-400">Live — updates every 5s</span>
      </div>
      <div id="seat-map" class="grid grid-cols-4 gap-2 max-w-xs">
        <?php foreach ($seats as $s): ?>
        <button type="button" id="seat-<?= $s['id'] ?>"
          onclick="toggleSeat('<?= $s['id'] ?>','<?= $s['seatNo'] ?>','<?= $s['status'] ?>')"
          <?= $s['status'] !== 'AVAILABLE' ? 'disabled' : '' ?>
          class="seat-btn rounded-md py-2 text-xs font-medium border <?= $s['status'] === 'AVAILABLE' ? 'bg-white hover:bg-[#FBF7F0] border-black/10' : 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed' ?>"
          data-status="<?= $s['status'] ?>">
          <?= htmlspecialchars($s['seatNo']) ?>
        </button>
        <?php endforeach; ?>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-xl shadow-sm border p-5 h-fit">
    <div class="font-semibold">Fare breakdown</div>
    <dl class="mt-2 text-sm space-y-1">
      <div class="flex justify-between"><dt>Fare × <span id="cnt">0</span></dt><dd id="fare-total">—</dd></div>
      <div class="flex justify-between text-slate-500"><dt>Service fee (7.0%)</dt><dd id="fee-total">—</dd></div>
      <div class="flex justify-between text-slate-500"><dt>VAT on fee (16%)</dt><dd id="vat-total">—</dd></div>
      <div class="flex justify-between font-bold border-t pt-1 mt-1"><dt>Total</dt><dd id="grand-total">—</dd></div>
    </dl>

    <form onsubmit="doCheckout(event)" class="mt-4 space-y-3">
      <input class="input" id="pax" placeholder="Passenger full name" required>
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref e.g. 0977123456" required>
      <div id="err" class="text-sm text-red-600 hidden"></div>
      <button id="pay-btn" class="btn-accent w-full" disabled>Pay —</button>
    </form>
  </div>
</div>

<script>
const TRIP_ID = '<?= $trip_id ?>';
const BASE = <?= $bd['baseAmountMinor'] ?>;
const FEE  = <?= $bd['commissionAmountMinor'] ?>;
const VAT  = <?= $bd['vatAmountMinor'] ?>;
let selected = [];

function fmt(n) { return 'ZMW ' + (n/100).toFixed(2); }

function toggleSeat(id, no, status) {
  if (status !== 'AVAILABLE') return;
  const idx = selected.indexOf(no);
  const btn = document.getElementById('seat-'+id);
  if (idx >= 0) {
    selected.splice(idx, 1);
    btn.className = 'seat-btn rounded-md py-2 text-xs font-medium border bg-white hover:bg-[#FBF7F0] border-black/10';
  } else {
    selected.push(no);
    btn.className = 'seat-btn rounded-md py-2 text-xs font-medium border bg-[#0B5D3B] text-white border-[#0B5D3B]';
  }
  updateTotals();
}

function updateTotals() {
  const n = selected.length;
  document.getElementById('cnt').textContent = n;
  document.getElementById('fare-total').textContent = fmt(BASE * n);
  document.getElementById('fee-total').textContent  = fmt(FEE  * n);
  document.getElementById('vat-total').textContent  = fmt(VAT  * n);
  document.getElementById('grand-total').textContent= fmt((BASE+FEE+VAT)*n);
  const btn = document.getElementById('pay-btn');
  btn.disabled = n === 0;
  btn.textContent = n > 0 ? 'Pay ' + fmt((BASE+FEE+VAT)*n) : 'Pay —';
}

async function doCheckout(e) {
  e.preventDefault();
  const btn = document.getElementById('pay-btn');
  btn.disabled = true; btn.textContent = 'Processing...';
  document.getElementById('err').classList.add('hidden');
  const r = await fetch('/api/bus/checkout.php', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({tripId:TRIP_ID,seatNos:selected,passengerName:document.getElementById('pax').value,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})
  });
  const d = await r.json();
  if (!r.ok) {
    document.getElementById('err').textContent = d.error||'Checkout failed';
    document.getElementById('err').classList.remove('hidden');
    btn.disabled = false; updateTotals(); return;
  }
  window.location.href = '/bus/' + d.bookingId + '/confirmation';
}

// Live seat map refresh
setInterval(async () => {
  const r = await fetch('/api/bus/trip.php?id=' + TRIP_ID);
  if (!r.ok) return;
  const d = await r.json();
  d.seats.forEach(s => {
    const btn = document.getElementById('seat-' + s.id);
    if (!btn) return;
    const wasSel = selected.includes(s.seatNo);
    if (s.status !== 'AVAILABLE' && wasSel) {
      selected = selected.filter(x => x !== s.seatNo);
      document.getElementById('seat-lost-msg').textContent = 'Seat ' + s.seatNo + ' was just booked by someone else and removed from your selection.';
      document.getElementById('seat-lost-msg').classList.remove('hidden');
      updateTotals();
    }
    if (!wasSel) {
      btn.disabled = s.status !== 'AVAILABLE';
      btn.className = 'seat-btn rounded-md py-2 text-xs font-medium border ' + (s.status === 'AVAILABLE' ? 'bg-white hover:bg-[#FBF7F0] border-black/10' : 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed');
      btn.dataset.status = s.status;
    }
  });
}, 5000);
</script>
<?php html_foot(); ?>
