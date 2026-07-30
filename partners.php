<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';

$pdo = db();
$stmt = $pdo->query('SELECT * FROM "ReferralPartner" ORDER BY name ASC');
$deals = $stmt->fetchAll();

html_head('Partners &amp; Deals — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Partner deals &amp; offers</h1>
  <p class="text-slate-500 mt-1">Exclusive partner network for Kwetu members.</p>

  <?php if (empty($deals)): ?><p class="mt-8 text-slate-500">No active partners right now — check back soon.</p><?php endif; ?>

  <div class="mt-6 grid sm:grid-cols-2 gap-6">
    <?php foreach ($deals as $d): ?>
    <div class="bg-white rounded-xl shadow-sm border p-5">
      <div class="text-lg font-bold text-[#0B5D3B] mb-1"><?= htmlspecialchars($d['name']) ?></div>
      <div class="text-sm text-slate-500 mb-3"><?= htmlspecialchars($d['category']) ?> · <?= $d['ratePct'] ?>% referral commission</div>
      <a href="/api/partners/click.php?id=<?= $d['id'] ?>" target="_blank" rel="noopener" class="btn-primary block text-center">Visit partner</a>
    </div>
    <?php endforeach; ?>
  </div>
</div>
<?php html_foot(); ?>
