<?php
require_once __DIR__ . '/includes/layout.php';
html_head('Kwetu — Everything You Need, Right Here.');
?>
<section class="bg-gradient-to-b from-[#0B5D3B] to-[#083F28] text-white">
  <div class="mx-auto max-w-6xl px-4 py-16 text-center">
    <h1 class="text-3xl md:text-5xl font-bold tracking-tight">
      Everything You Need, <span class="text-[#F2A65A]">Right Here.</span>
    </h1>
    <p class="mt-4 text-white/80 max-w-2xl mx-auto">
      Start with Zambia's most reliable way to book an intercity bus seat — transparent pricing,
      secure mobile-money checkout, a guaranteed seat.
    </p>
    <a href="/bus" class="inline-flex items-center gap-2 mt-6 bg-[#E8792B] hover:opacity-90 text-white font-semibold rounded-lg px-6 py-3 text-lg">
      🚌 Book a bus ticket
    </a>
  </div>
</section>

<section class="mx-auto max-w-6xl px-4 -mt-8 pb-8">
  <a href="/bus" class="block bg-white rounded-xl shadow-sm border-2 border-[#0B5D3B]/20 p-5 hover:shadow-md transition-shadow">
    <div class="flex items-center gap-4">
      <div class="text-5xl">🚌</div>
      <div>
        <div class="font-bold text-lg text-[#0B5D3B]">Intercity Bus — book now</div>
        <div class="text-sm text-slate-500 mt-1">Real seat maps, inventory locks, itemized fares, mobile-money checkout.</div>
      </div>
    </div>
  </a>
</section>

<section class="mx-auto max-w-6xl px-4 pb-16">
  <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Also available</h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
    <?php
    $verticals = [
      ['/stays',     '🏨', 'Accommodation',      'Hotels, lodges & apartments.'],
      ['/events',    '🎟️', 'Events',             'Football, concerts, exhibitions.'],
      ['/services',  '🛠️', 'Local Services',     'Hire vetted local providers.'],
      ['/rentals',   '🏠', 'Property Rentals',   'Find a place to rent.'],
      ['/land',      '🌍', 'Land Sales',         'Browse verified land listings.'],
      ['/insurance', '🛡️', 'Travel Insurance',   'Quote & bind micro-insurance.'],
      ['/partners',  '🔗', 'Rides, Food & Parcel','Jump to trusted partners.'],
    ];
    foreach ($verticals as [$href, $emoji, $title, $desc]): ?>
    <a href="<?= $href ?>" class="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
      <div class="text-3xl"><?= $emoji ?></div>
      <div class="mt-2 font-semibold"><?= $title ?></div>
      <div class="text-sm text-slate-500 mt-1"><?= $desc ?></div>
    </a>
    <?php endforeach; ?>
  </div>
</section>
<?php html_foot(); ?>
