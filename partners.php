<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';

$pdo = db();
$stmt = $pdo->query('SELECT * FROM "PartnerDeal" WHERE "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > NOW()) ORDER BY "createdAt" DESC');
$deals = $stmt->fetchAll();

html_head('Partners &amp; Deals — Kwetu');
?>
<div class="mx-auto max-w-4xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Partner deals &amp; offers</h1>
  <p class="text-slate-500 mt-1">Exclusive discounts for Kwetu members.</p>

  <?php if (empty($deals)): ?><p class="mt-8 text-slate-500">No active deals right now — check back soon.</p><?php endif; ?>

  <div class="mt-6 grid sm:grid-cols-2 gap-6">
    <?php foreach ($deals as $d):
      $logo = $d['logoUrl'] ?? '';
    ?>
    <div class="bg-white rounded-xl shadow-sm border p-5">
      <?php if ($logo): ?>
      <img src="<?= htmlspecialchars($logo) ?>" alt="<?= htmlspecialchars($d['partnerName']) ?>" class="h-10 object-contain mb-3">
      <?php else: ?>
      <div class="text-lg font-bold text-[#0B5D3B] mb-3"><?= htmlspecialchars($d['partnerName']) ?></div>
      <?php endif; ?>
      <div class="font-semibold"><?= htmlspecialchars($d['title']) ?></div>
      <p class="text-sm text-slate-500 mt-1"><?= htmlspecialchars($d['description']) ?></p>
      <?php if ($d['expiresAt']): ?>
      <div class="text-xs text-slate-400 mt-2">Expires: <?= date('d M Y', strtotime($d['expiresAt'])) ?></div>
      <?php endif; ?>
      <a href="/api/partners/click.php?id=<?= $d['id'] ?>" target="_blank" rel="noopener" class="btn-primary mt-4 block text-center">Claim deal</a>
    </div>
    <?php endforeach; ?>
  </div>
</div>
<?php html_foot(); ?>
