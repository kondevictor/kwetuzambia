<?php
require_once __DIR__ . '/includes/layout.php';
$error = $_GET['error'] ?? '';
html_head('Register — Kwetu');
?>
<div class="mx-auto max-w-md px-4 py-16">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Create your Kwetu account</h1>
  <?php if ($error): ?>
    <div class="mt-4 text-sm text-red-600"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>
  <form method="POST" action="/api/auth/register.php" class="bg-white rounded-xl shadow-sm border p-5 mt-6 space-y-4">
    <div>
      <label class="text-sm font-medium">Full name</label>
      <input class="input mt-1" name="name" required minlength="2">
    </div>
    <div>
      <label class="text-sm font-medium">Email</label>
      <input class="input mt-1" type="email" name="email" required>
    </div>
    <div>
      <label class="text-sm font-medium">Password</label>
      <input class="input mt-1" type="password" name="password" required minlength="6">
    </div>
    <div>
      <label class="text-sm font-medium">Account type</label>
      <select class="input mt-1" name="role">
        <option value="CONSUMER">Consumer — book &amp; buy</option>
        <option value="SUPPLIER">Supplier — list &amp; sell</option>
      </select>
    </div>
    <button class="btn-primary w-full">Sign up</button>
  </form>
</div>
<?php html_foot(); ?>
