<?php
require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/pricing.php';
require_once __DIR__ . '/includes/money.php';
require_once __DIR__ . '/includes/auth.php';

$user = current_user();
html_head('Insurance — Kwetu');
?>
<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Insurance products</h1>
  <p class="text-slate-500 mt-1">Get a quote, compare rates, and bind your policy instantly.</p>

  <div id="step1" class="bg-white rounded-xl shadow-sm border p-6 mt-6">
    <h2 class="font-semibold text-lg">Step 1 — Get a quote</h2>
    <form onsubmit="getQuote(event)" class="mt-4 space-y-4">
      <div>
        <label class="text-sm font-medium">Product type</label>
        <select class="input mt-1" id="ptype">
          <option value="TRAVEL">Travel</option>
          <option value="MOTOR">Motor</option>
          <option value="HEALTH">Health</option>
          <option value="HOME">Home</option>
          <option value="LIFE">Life</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Sum insured (ZMW)</label>
        <input class="input mt-1" id="sum" type="number" placeholder="e.g. 50000" min="1000" required>
      </div>
      <div>
        <label class="text-sm font-medium">Coverage period (months)</label>
        <input class="input mt-1" id="months" type="number" value="12" min="1" max="60" required>
      </div>
      <div id="qerr" class="text-sm text-red-600 hidden"></div>
      <button class="btn-primary w-full">Get quote</button>
    </form>
  </div>

  <div id="step2" class="hidden bg-white rounded-xl shadow-sm border p-6 mt-6">
    <h2 class="font-semibold text-lg">Step 2 — Review &amp; bind</h2>
    <div id="quote-details" class="text-sm space-y-1 mt-3 text-slate-700"></div>
    <form onsubmit="bindPolicy(event)" class="mt-4 space-y-3">
      <select class="input" id="method">
        <option value="AIRTEL_MONEY">Airtel Money</option>
        <option value="MTN_MONEY">MTN Mobile Money</option>
        <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
        <option value="CARD">Card</option>
      </select>
      <input class="input" id="phone" placeholder="Phone / card ref" required>
      <div id="berr" class="text-sm text-red-600 hidden"></div>
      <div class="flex gap-3">
        <button type="button" onclick="document.getElementById('step2').classList.add('hidden');document.getElementById('step1').classList.remove('hidden')" class="btn-outline flex-1">Back</button>
        <button class="btn-primary flex-1">Bind &amp; Pay</button>
      </div>
    </form>
  </div>
</div>

<script>
let _quoteId, _premium;
async function getQuote(e) {
  e.preventDefault();
  document.getElementById('qerr').classList.add('hidden');
  const r = await fetch('/api/insurance/quote.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productType:document.getElementById('ptype').value,sumInsuredMinor:Math.round(parseFloat(document.getElementById('sum').value)*100),coverageMonths:parseInt(document.getElementById('months').value)})});
  const d = await r.json();
  if (!r.ok){document.getElementById('qerr').textContent=d.error||'Quote failed';document.getElementById('qerr').classList.remove('hidden');return;}
  _quoteId=d.quoteId; _premium=d.premiumMinor;
  document.getElementById('quote-details').innerHTML = `
    <p><strong>Product:</strong> ${d.productType}</p>
    <p><strong>Sum insured:</strong> ZMW ${(d.sumInsuredMinor/100).toFixed(2)}</p>
    <p><strong>Monthly premium:</strong> ZMW ${(d.monthlyPremiumMinor/100).toFixed(2)}</p>
    <p><strong>Annual premium (incl. 18% platform fee):</strong> ZMW ${(d.premiumMinor/100).toFixed(2)}</p>
    <p><strong>Coverage:</strong> ${d.coverageMonths} months</p>
  `;
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
}
async function bindPolicy(e) {
  e.preventDefault();
  document.getElementById('berr').classList.add('hidden');
  const r = await fetch('/api/insurance/bind.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quoteId:_quoteId,method:document.getElementById('method').value,msisdnOrCardRef:document.getElementById('phone').value})});
  const d = await r.json();
  if (!r.ok){document.getElementById('berr').textContent=d.error||'Bind failed';document.getElementById('berr').classList.remove('hidden');return;}
  window.location.href='/dashboard';
}
</script>
<?php html_foot(); ?>
