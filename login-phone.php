<?php
require_once __DIR__ . '/includes/layout.php';
html_head('Phone sign-in — Kwetu');
?>
<div class="mx-auto max-w-md px-4 py-16">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Sign in with your phone</h1>
  <p class="text-sm text-slate-500 mt-1">No password to remember — we'll text you a one-time code.</p>

  <div id="step-phone">
    <form onsubmit="requestCode(event)" class="bg-white rounded-xl shadow-sm border p-5 mt-6 space-y-4">
      <div>
        <label class="text-sm font-medium">Phone number</label>
        <input class="input mt-1" id="phone" placeholder="0977123456" required>
      </div>
      <div>
        <label class="text-sm font-medium">Name (only for new accounts)</label>
        <input class="input mt-1" id="uname" placeholder="Your name">
      </div>
      <div id="phone-error" class="text-sm text-red-600 hidden"></div>
      <button class="btn-primary w-full" type="submit">Send code</button>
    </form>
  </div>

  <div id="step-code" style="display:none">
    <div class="bg-white rounded-xl shadow-sm border p-5 mt-6 space-y-4">
      <p class="text-sm text-slate-500">Code sent. <span id="phone-display"></span></p>
      <div id="dev-note" class="hidden text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2"></div>
      <div>
        <label class="text-sm font-medium">6-digit code</label>
        <input class="input mt-1" id="code" placeholder="123456" maxlength="6">
      </div>
      <div id="code-error" class="text-sm text-red-600 hidden"></div>
      <button class="btn-primary w-full" onclick="verifyCode()">Verify &amp; sign in</button>
      <button class="text-sm text-slate-500 underline" onclick="document.getElementById('step-phone').style.display='';document.getElementById('step-code').style.display='none';">Use a different number</button>
    </div>
  </div>

  <p class="mt-4 text-sm text-slate-500">Prefer email? <a class="text-[#0B5D3B] underline" href="/login">Sign in with email</a></p>
</div>
<script>
async function requestCode(e) {
  e.preventDefault();
  const phone = document.getElementById('phone').value;
  const r = await fetch('/api/auth/otp-request.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
  const d = await r.json();
  if (!r.ok) { document.getElementById('phone-error').textContent = d.error||'Error'; document.getElementById('phone-error').classList.remove('hidden'); return; }
  document.getElementById('phone-display').textContent = 'Sent to ' + phone;
  if (d.devNote) { document.getElementById('dev-note').textContent = d.devNote; document.getElementById('dev-note').classList.remove('hidden'); }
  document.getElementById('step-phone').style.display = 'none';
  document.getElementById('step-code').style.display = '';
}
async function verifyCode() {
  const phone = document.getElementById('phone').value;
  const code  = document.getElementById('code').value;
  const name  = document.getElementById('uname').value;
  const r = await fetch('/api/auth/otp-verify.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code,name})});
  if (r.ok) { window.location.href = '/dashboard'; return; }
  const d = await r.json();
  document.getElementById('code-error').textContent = d.error||'Invalid code';
  document.getElementById('code-error').classList.remove('hidden');
}
</script>
<?php html_foot(); ?>
