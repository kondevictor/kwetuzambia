<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';

$category = trim($_GET['category'] ?? '');
$city     = trim($_GET['city'] ?? '');

$pdo = db();
$where = ['1=1'];
$params = [];
if ($category) { $where[] = 'sl.category = ?'; $params[] = $category; }

$whereStr = implode(' AND ', $where);
$stmt = $pdo->prepare("SELECT sl.*, u.name AS provider_name FROM \"ServiceListing\" sl JOIN \"User\" u ON u.id = sl.\"ownerId\" WHERE $whereStr ORDER BY sl.\"priceMinor\" ASC LIMIT 50");
$stmt->execute($params);
$listings = $stmt->fetchAll();

$cats = $pdo->query('SELECT DISTINCT category FROM "ServiceListing" ORDER BY category')->fetchAll(PDO::FETCH_COLUMN);

html_head('Services — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Local services</h1>
  <form method="GET" class="bg-white rounded-xl shadow-sm border p-5 mt-4 grid sm:grid-cols-3 gap-4 items-end">
    <div>
      <label class="text-sm font-medium">Category</label>
      <select class="input mt-1" name="category">
        <option value="">All categories</option>
        <?php foreach ($cats as $c): ?>
        <option value="<?= htmlspecialchars($c) ?>" <?= $c===$category?'selected':'' ?>><?= htmlspecialchars($c) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label class="text-sm font-medium">City</label>
      <input class="input mt-1" name="city" value="<?= htmlspecialchars($city) ?>" placeholder="Lusaka">
    </div>
    <button class="btn-primary">Search</button>
  </form>

  <?php if (empty($listings)): ?>
  <p class="mt-8 text-slate-500">No services found.</p>
  <?php endif; ?>

  <div class="mt-6 space-y-4">
    <?php foreach ($listings as $l):
      $bd = compute_commission_on_top('SERVICE', (int)$l['priceMinor']);
    ?>
    <div class="bg-white rounded-xl shadow-sm border p-5 flex justify-between items-center gap-4">
      <div>
        <div class="font-medium"><?= htmlspecialchars($l['title']) ?></div>
        <div class="text-sm text-slate-500"><?= htmlspecialchars($l['category']) ?> · by <?= htmlspecialchars($l['provider_name']) ?></div>
        <div class="text-[#0B5D3B] font-bold mt-1"><?= format_zmw($bd['totalAmountMinor']) ?> <span class="font-normal text-slate-400 text-xs">incl. fee</span></div>
      </div>
      <button onclick="bookService('<?= $l['id'] ?>','<?= addslashes($l['title']) ?>',<?= $bd['totalAmountMinor'] ?>)" class="btn-primary shrink-0">Book</button>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
    <h2 class="font-bold" id="modal-title"></h2>
    <form onsubmit="doBook(event)" class="mt-4 space-y-3">
      <input class="input" type="date" id="date" required>
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref" required>
      <div id="serr" class="text-sm text-red-600 hidden"></div>
      <div class="flex gap-3">
        <button type="button" onclick="document.getElementById('modal').classList.add('hidden')" class="btn-outline flex-1">Cancel</button>
        <button class="btn-primary flex-1">Confirm &amp; Pay</button>
      </div>
    </form>
  </div>
</div>

<script>
let _lid;
function bookService(lid, title, total) {
  _lid=lid;
  document.getElementById('modal-title').textContent = title + ' — ZMW '+(total/100).toFixed(2);
  document.getElementById('modal').classList.remove('hidden');
}
async function doBook(e) {
  e.preventDefault();
  document.getElementById('serr').classList.add('hidden');
  const r = await fetch('/api/services/checkout.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listingId:_lid,scheduledDate:document.getElementById('date').value,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})});
  const d = await r.json();
  if (!r.ok){document.getElementById('serr').textContent=d.error||'Failed';document.getElementById('serr').classList.remove('hidden');return;}
  window.location.href='/dashboard';
}
</script>
<?php html_foot(); ?>
