<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/auth.php';

$user = require_admin();
$pdo  = db();

$summary = $pdo->query('SELECT (SELECT COUNT(*) FROM "User") AS users, (SELECT COUNT(*) FROM "BusBooking" WHERE status = \'CONFIRMED\') AS bus_bookings, (SELECT SUM("commissionAmountMinor") FROM "CommissionRecord" WHERE "createdAt" > NOW() - INTERVAL \'30 days\') AS commission_30d, (SELECT COUNT(*) FROM "Operator" WHERE verified = false) AS unverified_operators')->fetch();

$operators = $pdo->query('SELECT o.*, u.name AS owner_name, u.email FROM "Operator" o JOIN "User" u ON u.id = o."ownerId" ORDER BY o."createdAt" DESC LIMIT 30')->fetchAll();

$refunds = $pdo->query('SELECT r.*, p."userId", u.name AS user_name FROM "Refund" r JOIN "Payment" p ON p.id = r."paymentId" JOIN "User" u ON u.id = p."userId" ORDER BY r."createdAt" DESC LIMIT 20')->fetchAll();

html_head('Admin — Kwetu');
?>
<div class="mx-auto max-w-5xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Admin panel</h1>

  <div class="grid sm:grid-cols-4 gap-4 mt-6">
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Total users</div><div class="text-2xl font-bold"><?= (int)$summary['users'] ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Confirmed bus bookings</div><div class="text-2xl font-bold"><?= (int)$summary['bus_bookings'] ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Commission (30d)</div><div class="text-2xl font-bold text-[#0B5D3B]"><?= format_zmw((int)($summary['commission_30d'] ?? 0)) ?></div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5"><div class="text-xs text-slate-400">Unverified operators</div><div class="text-2xl font-bold text-red-500"><?= (int)$summary['unverified_operators'] ?></div></div>
  </div>

  <div class="mt-8">
    <div class="flex justify-between items-center">
      <h2 class="font-semibold">Operators</h2>
      <a href="/api/admin/reconciliation.php" target="_blank" class="text-sm text-[#0B5D3B] underline">Run reconciliation</a>
    </div>
    <div class="mt-3 overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead class="text-left text-slate-400 border-b">
          <tr><th class="pb-2 pr-4">Operator</th><th class="pb-2 pr-4">Owner</th><th class="pb-2 pr-4">Status</th><th class="pb-2">Action</th></tr>
        </thead>
        <tbody class="divide-y">
          <?php foreach ($operators as $op): ?>
          <tr class="bg-white">
            <td class="py-2 pr-4 font-medium"><?= htmlspecialchars($op['name']) ?></td>
            <td class="py-2 pr-4 text-slate-500"><?= htmlspecialchars($op['owner_name']) ?> · <?= htmlspecialchars($op['email']) ?></td>
            <td class="py-2 pr-4"><?php if ($op['verified']): ?><span class="badge">Verified</span><?php else: ?><span class="badge bg-amber-100 text-amber-700">Pending</span><?php endif; ?></td>
            <td class="py-2">
              <?php if (!$op['verified']): ?>
              <button onclick="verifyOp('<?= $op['id'] ?>',true)" class="text-xs text-[#0B5D3B] underline mr-2">Verify</button>
              <button onclick="verifyOp('<?= $op['id'] ?>',false)" class="text-xs text-red-500 underline">Reject</button>
              <?php endif; ?>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="mt-8">
    <h2 class="font-semibold">Recent refunds</h2>
    <div class="mt-3 space-y-2">
      <?php if (empty($refunds)): ?><p class="text-sm text-slate-400">None.</p><?php endif; ?>
      <?php foreach ($refunds as $r): ?>
      <div class="bg-white rounded-xl border px-5 py-3 flex justify-between text-sm">
        <div><span class="font-medium"><?= htmlspecialchars($r['user_name']) ?></span> · <?= htmlspecialchars($r['reason']) ?></div>
        <span class="font-semibold text-[#0B5D3B]"><?= format_zmw((int)$r['amountMinor']) ?></span>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="mt-8 bg-white rounded-xl border p-5">
    <h2 class="font-semibold">Issue refund</h2>
    <form onsubmit="issueRefund(event)" class="mt-3 grid sm:grid-cols-3 gap-3">
      <input class="input" id="pid" placeholder="Payment ID" required>
      <input class="input" id="reason" placeholder="Reason" required>
      <button class="btn-primary">Refund</button>
    </form>
    <div id="rfmsg" class="mt-2 text-sm hidden"></div>
  </div>
</div>

<script>
async function verifyOp(id, verify) {
  const r = await fetch('/api/admin/operator-verify.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operatorId:id,verified:verify})});
  if (r.ok) location.reload(); else alert('Failed');
}
async function issueRefund(e) {
  e.preventDefault();
  const r = await fetch('/api/admin/refund.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentId:document.getElementById('pid').value,reason:document.getElementById('reason').value})});
  const d = await r.json();
  const el = document.getElementById('rfmsg');
  el.textContent = r.ok ? 'Refund issued: '+d.refundId : (d.error||'Failed');
  el.className = 'mt-2 text-sm ' + (r.ok?'text-[#0B5D3B]':'text-red-600');
  el.classList.remove('hidden');
}
</script>
<?php html_foot(); ?>
