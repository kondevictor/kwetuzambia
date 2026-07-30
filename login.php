<?php
require_once __DIR__ . '/includes/layout.php';
$error = $_GET['error'] ?? '';
html_head('Log in — Kwetu');
?>
<div class="mx-auto max-w-md px-4 py-16">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Log in to Kwetu</h1>
  <?php if ($error): ?>
    <div class="mt-4 text-sm text-red-600"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>
  <form method="POST" action="/api/auth/login.php" class="bg-white rounded-xl shadow-sm border p-5 mt-6 space-y-4">
    <div>
      <label class="text-sm font-medium">Email</label>
      <input class="input mt-1" type="email" name="email" required>
    </div>
    <div>
      <label class="text-sm font-medium">Password</label>
      <input class="input mt-1" type="password" name="password" required>
    </div>
    <button class="btn-primary w-full">Sign in</button>
  </form>
  <p class="mt-4 text-sm text-slate-500">No account? <a class="text-[#0B5D3B] underline" href="/register">Sign up</a></p>
  <p class="mt-2 text-sm text-slate-500">Prefer no password? <a class="text-[#0B5D3B] underline" href="/login/phone">Sign in with phone</a></p>
  <div class="mt-6 text-xs text-slate-400">
    Demo accounts (password123): chanda@example.com (consumer) · ops@mazhandu.example.com (supplier) · admin@kwetu.zm (admin)
  </div>
</div>
<?php html_foot(); ?>
