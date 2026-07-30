<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/auth.php';

$id  = $_GET['id'] ?? '';
$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM "Property" WHERE id = ?');
$stmt->execute([$id]);
$prop = $stmt->fetch();
if (!$prop) { header('Location: /stays'); exit; }

$rooms = $pdo->prepare('SELECT * FROM "Room" WHERE "propertyId" = ? ORDER BY "basePricePerNightMinor" ASC');
$rooms->execute([$id]);
$rooms = $rooms->fetchAll();

$user = current_user();
html_head(htmlspecialchars($prop['name']) . ' — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <div class="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-6xl">🏨</div>

  <h1 class="text-2xl font-bold text-[#0B5D3B] mt-6"><?= htmlspecialchars($prop['name']) ?></h1>
  <p class="text-slate-500"><?= htmlspecialchars($prop['city']) ?></p>
  <p class="mt-3 text-slate-700"><?= nl2br(htmlspecialchars($prop['description'])) ?></p>

  <div class="mt-8 space-y-4">
    <h2 class="font-semibold">Available rooms</h2>
    <?php foreach ($rooms as $r):
      $bd = compute_commission_on_top('ACCOMMODATION', (int)$r['ratePerNightMinor']);
    ?>
    <div class="bg-white rounded-xl shadow-sm border p-5 flex justify-between items-center gap-4">
      <div>
        <div class="font-medium"><?= htmlspecialchars($r['type']) ?></div>
        <div class="text-sm text-slate-500">Qty: <?= (int)$r['quantity'] ?></div>
        <div class="text-[#0B5D3B] font-bold mt-1"><?= format_zmw($bd['totalAmountMinor']) ?>/night <span class="font-normal text-slate-400 text-xs">incl. fee</span></div>
      </div>
      <button onclick="openBook('<?= $r['id'] ?>','<?= addslashes($r['type']) ?>',<?= $bd['baseAmountMinor'] ?>,<?= $bd['commissionAmountMinor'] ?>,<?= $bd['vatAmountMinor'] ?>)" class="btn-primary shrink-0">Book</button>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<!-- Booking modal -->
<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
    <h2 class="font-bold text-lg" id="modal-title"></h2>
    <form onsubmit="doBook(event)" class="mt-4 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm">Check-in</label><input class="input mt-1" type="date" id="ci" required></div>
        <div><label class="text-sm">Check-out</label><input class="input mt-1" type="date" id="co" required></div>
      </div>
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref" required>
      <div id="price-line" class="text-sm text-slate-500"></div>
      <div id="serr" class="text-sm text-red-600 hidden"></div>
      <div class="flex gap-3">
        <button type="button" onclick="closeModal()" class="btn-outline flex-1">Cancel</button>
        <button class="btn-primary flex-1">Confirm &amp; Pay</button>
      </div>
    </form>
  </div>
</div>

<script>
let _roomId, _base, _fee, _vat;
function openBook(roomId, name, base, fee, vat) {
  _roomId=roomId; _base=base; _fee=fee; _vat=vat;
  document.getElementById('modal-title').textContent = 'Book: ' + name;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('ci').addEventListener('change', updatePriceLine);
  document.getElementById('co').addEventListener('change', updatePriceLine);
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function updatePriceLine() {
  const ci = document.getElementById('ci').value;
  const co = document.getElementById('co').value;
  if (!ci||!co) return;
  const n = Math.max(1, Math.round((new Date(co)-new Date(ci))/86400000));
  const t = (_base+_fee+_vat)*n;
  document.getElementById('price-line').textContent = n + ' night(s) × ZMW '+(_base/100).toFixed(2)+' + fees = ZMW '+(t/100).toFixed(2);
}
async function doBook(e) {
  e.preventDefault();
  document.getElementById('serr').classList.add('hidden');
  const r = await fetch('/api/stays/checkout.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:_roomId,checkin:document.getElementById('ci').value,checkout:document.getElementById('co').value,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})});
  const d = await r.json();
  if (!r.ok){document.getElementById('serr').textContent=d.error||'Checkout failed';document.getElementById('serr').classList.remove('hidden');return;}
  window.location.href='/dashboard';
}
</script>
<?php html_foot(); ?>
