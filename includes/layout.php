<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

function html_head(string $title = 'Kwetu — Everything You Need, Right Here.'): void {
    $user = current_user();
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($title) ?></title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: { extend: { colors: { kwetu: {
    green: '#0B5D3B', greenDark: '#083F28',
    orange: '#E8792B', orangeLight: '#F2A65A', cream: '#FBF7F0'
  }}}}
}
</script>
<style>
body { background-color: #FBF7F0; }
.card { @apply bg-white rounded-xl shadow-sm border p-5; }
.btn-primary { display:inline-flex;align-items:center;justify-content:center;border-radius:.5rem;background:#0B5D3B;padding:.625rem 1rem;color:#fff;font-weight:500; }
.btn-primary:hover { background:#083F28; }
.btn-accent  { display:inline-flex;align-items:center;justify-content:center;border-radius:.5rem;background:#E8792B;padding:.625rem 1rem;color:#fff;font-weight:500; }
.btn-accent:hover { opacity:.9; }
.input { width:100%;border-radius:.5rem;border:1px solid rgba(0,0,0,.1);padding:.5rem .75rem; }
.input:focus { outline:none;box-shadow:0 0 0 2px rgba(11,93,59,.4); }
.badge { display:inline-flex;align-items:center;gap:.25rem;border-radius:9999px;background:rgba(11,93,59,.1);color:#0B5D3B;font-size:.75rem;font-weight:500;padding:.125rem .5rem; }
</style>
</head>
<body class="min-h-screen text-slate-900 antialiased">
<?php nav_bar($user); ?>
<main>
<?php
}

function nav_bar(?array $user): void { ?>
<header class="sticky top-0 z-30 bg-[#0B5D3B] text-white">
  <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
    <a href="/" class="font-bold text-lg tracking-tight">Kwetu</a>
    <nav class="hidden md:flex items-center gap-4 text-sm">
      <a href="/bus">Bus</a>
      <a href="/stays">Stays</a>
      <a href="/events">Events</a>
      <a href="/services">Services</a>
      <a href="/rentals">Rentals</a>
      <a href="/land">Land</a>
      <a href="/insurance">Insurance</a>
      <a href="/partners">Partners</a>
    </nav>
    <div class="flex items-center gap-3 text-sm">
      <?php if ($user): ?>
        <a href="/dashboard" class="hover:underline"><?= htmlspecialchars(explode(' ', $user['name'])[0]) ?></a>
        <?php if ($user['role'] !== 'CONSUMER'): ?>
          <a href="/supplier" class="hover:underline">Supplier</a>
        <?php endif; ?>
        <?php if ($user['role'] === 'ADMIN'): ?>
          <a href="/admin" class="hover:underline">Admin</a>
        <?php endif; ?>
        <a href="/api/auth/logout.php" class="btn-accent !py-1.5 !px-3">Sign out</a>
      <?php else: ?>
        <a href="/login" class="hover:underline">Log in</a>
        <a href="/register" class="btn-accent !py-1.5 !px-3">Sign up</a>
      <?php endif; ?>
    </div>
  </div>
</header>
<?php }

function html_foot(): void { ?>
</main>
<footer class="mt-16 border-t border-black/5 py-8 text-center text-sm text-slate-500">
  Kwetu Zambia — demo build. Payments and USSD are simulated.
</footer>
<div id="chat-widget" style="position:fixed;bottom:1rem;right:1rem;z-index:40;">
  <button onclick="toggleChat()" id="chat-btn" style="width:3.5rem;height:3.5rem;border-radius:9999px;background:#E8792B;color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.2);">💬</button>
  <div id="chat-box" style="display:none;position:absolute;bottom:4rem;right:0;width:20rem;height:440px;background:#fff;border-radius:.75rem;border:1px solid rgba(0,0,0,.1);box-shadow:0 8px 32px rgba(0,0,0,.15);display:none;flex-direction:column;overflow:hidden;">
    <div style="background:#0B5D3B;color:#fff;padding:.75rem 1rem;display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-weight:600;font-size:.875rem;">Kwetu Assistant</div><div style="font-size:.75rem;opacity:.7;">Onboarding help</div></div>
      <button onclick="toggleChat()" style="color:rgba(255,255,255,.8);font-size:1.25rem;">×</button>
    </div>
    <div id="chat-messages" style="flex:1;overflow-y:auto;padding:.75rem;background:#FBF7F0;display:flex;flex-direction:column;gap:.5rem;">
      <div class="bot-msg" style="background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;color:#334155;max-width:85%;">Hi! I'm the Kwetu onboarding assistant. Are you here to book something, or to sell/list on Kwetu?</div>
    </div>
    <div id="chat-suggestions" style="display:flex;flex-wrap:wrap;gap:.375rem;padding:.5rem .75rem;border-top:1px solid rgba(0,0,0,.05);">
      <button onclick="sendChat('I want to book something')" class="chat-chip">I want to book something</button>
      <button onclick="sendChat('I want to sell on Kwetu')" class="chat-chip">I want to sell on Kwetu</button>
      <button onclick="sendChat('What is Kwetu?')" class="chat-chip">What is Kwetu?</button>
    </div>
    <style>.chat-chip{font-size:.75rem;padding:.25rem .625rem;border-radius:9999px;border:1px solid rgba(11,93,59,.3);color:#0B5D3B;background:transparent;cursor:pointer;}.chat-chip:hover{background:rgba(11,93,59,.1);}</style>
    <form id="chat-form" onsubmit="submitChat(event)" style="display:flex;gap:.5rem;border-top:1px solid rgba(0,0,0,.05);padding:.5rem;">
      <input id="chat-input" class="input !py-1.5 text-sm" placeholder="Ask a question..." style="flex:1;">
      <button type="submit" class="btn-accent !py-1.5 !px-3 text-sm">Send</button>
    </form>
  </div>
</div>
<script>
let chatOpen = false;
function toggleChat() {
  chatOpen = !chatOpen;
  const box = document.getElementById('chat-box');
  box.style.display = chatOpen ? 'flex' : 'none';
  document.getElementById('chat-btn').textContent = chatOpen ? '×' : '💬';
}
async function sendChat(text) {
  if (!text) return;
  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML += `<div style="display:flex;justify-content:flex-end;"><div style="background:#0B5D3B;color:#fff;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;max-width:85%;">${text}</div></div>`;
  document.getElementById('chat-input').value = '';
  const r = await fetch('/api/chatbot.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
  const d = await r.json();
  msgs.innerHTML += `<div class="bot-msg" style="background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;color:#334155;max-width:85%;">${d.text}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
  const chips = document.getElementById('chat-suggestions');
  chips.innerHTML = (d.suggestions||[]).map(s=>`<button onclick="sendChat('${s.replace(/'/g,"\\'")}')" class="chat-chip">${s}</button>`).join('');
}
function submitChat(e) { e.preventDefault(); sendChat(document.getElementById('chat-input').value.trim()); }
</script>
</body>
</html>
<?php }
