<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';

$pdo = db();
$stmt = $pdo->query('SELECT l.*, u.name AS owner_name FROM "LandListing" l JOIN "User" u ON u.id = l."ownerId" ORDER BY l."createdAt" DESC LIMIT 50');
$listings = $stmt->fetchAll();

html_head('Land — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Land for sale</h1>

  <?php if (empty($listings)): ?><p class="mt-8 text-slate-500">No listings yet.</p><?php endif; ?>

  <div class="mt-6 grid sm:grid-cols-2 gap-6">
    <?php foreach ($listings as $l):
      $fee = placement_fee_for_land((int)$l['priceMinor']);
      $imgs = json_decode($l['images'] ?? '[]', true);
      $img = $imgs[0] ?? '';
    ?>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <?php if ($img): ?>
      <div class="h-40 bg-cover bg-center" style="background-image:url('<?= htmlspecialchars($img) ?>')"></div>
      <?php else: ?>
      <div class="h-40 bg-slate-100 flex items-center justify-center text-4xl">🌍</div>
      <?php endif; ?>
      <div class="p-4">
        <div class="font-semibold"><?= htmlspecialchars($l['title']) ?></div>
        <div class="text-sm text-slate-500"><?= htmlspecialchars($l['location']) ?> · <?= htmlspecialchars($l['sizeDescription'] ?? '') ?></div>
        <div class="text-[#0B5D3B] font-bold mt-1"><?= format_zmw((int)$l['priceMinor']) ?></div>
        <div class="text-xs text-slate-400">Platform fee: <?= format_zmw($fee) ?></div>
        <button onclick="buyLand('<?= $l['id'] ?>','<?= addslashes($l['title']) ?>',<?= $fee ?>)" class="btn-primary mt-3 w-full">Pay fee &amp; enquire</button>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
    <h2 class="font-bold" id="modal-title"></h2>
    <form onsubmit="doPay(event)" class="mt-4 space-y-3">
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref" required>
      <div id="lerr" class="text-sm text-red-600 hidden"></div>
      <div class="flex gap-3">
        <button type="button" onclick="document.getElementById('modal').classList.add('hidden')" class="btn-outline flex-1">Cancel</button>
        <button class="btn-primary flex-1">Pay</button>
      </div>
    </form>
  </div>
</div>
<script>
let _lid;
function buyLand(lid, title, fee) {
  _lid=lid;
  document.getElementById('modal-title').textContent = title + ' — ZMW '+(fee/100).toFixed(2)+' fee';
  document.getElementById('modal').classList.remove('hidden');
}
async function doPay(e) {
  e.preventDefault();
  document.getElementById('lerr').classList.add('hidden');
  const r = await fetch('/api/land/pay.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listingId:_lid,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})});
  const d = await r.json();
  if (!r.ok){document.getElementById('lerr').textContent=d.error||'Failed';document.getElementById('lerr').classList.remove('hidden');return;}
  alert('Payment successful! Seller contact: '+d.sellerContact);
  document.getElementById('modal').classList.add('hidden');
}
</script>
<?php html_foot(); ?>
