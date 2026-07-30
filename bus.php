<?php
require_once __DIR__ . '/includes/layout.php';
html_head('Bus tickets — Kwetu');
?>
<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Search intercity buses</h1>
  <form method="GET" action="/bus-results.php" class="bg-white rounded-xl shadow-sm border p-5 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
    <div>
      <label class="text-sm font-medium">From</label>
      <input class="input mt-1" name="origin" value="Lusaka" required>
    </div>
    <div>
      <label class="text-sm font-medium">To</label>
      <input class="input mt-1" name="destination" value="Ndola" required>
    </div>
    <button class="btn-primary">Search</button>
  </form>
  <p class="text-sm text-slate-500 mt-4">Try Lusaka–Ndola, Lusaka–Livingstone, or Lusaka–Kitwe.</p>
</div>
<?php html_foot(); ?>
