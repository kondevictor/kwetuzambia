<?php
require_once __DIR__ . '/includes/layout.php';

html_head('USSD — Kwetu');
?>
<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="text-2xl font-bold text-[#0B5D3B]">Kwetu USSD service</h1>
  <p class="text-slate-500 mt-2">No smartphone? No problem. Access Kwetu with any phone by dialling:</p>

  <div class="bg-[#0B5D3B] text-white rounded-xl p-8 mt-6 text-center">
    <div class="text-5xl font-mono font-bold tracking-wider">*800#</div>
    <div class="mt-2 text-sm text-green-200">Available on Airtel, MTN and Zamtel</div>
  </div>

  <div class="grid sm:grid-cols-3 gap-4 mt-8">
    <div class="bg-white rounded-xl shadow-sm border p-5 text-center"><div class="text-2xl">1️⃣</div><div class="font-medium mt-2">Dial *800#</div><div class="text-sm text-slate-500">On any Zambia mobile number</div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5 text-center"><div class="text-2xl">2️⃣</div><div class="font-medium mt-2">Select service</div><div class="text-sm text-slate-500">Bus tickets, payments, balance</div></div>
    <div class="bg-white rounded-xl shadow-sm border p-5 text-center"><div class="text-2xl">3️⃣</div><div class="font-medium mt-2">Confirm with PIN</div><div class="text-sm text-slate-500">Secure mobile money checkout</div></div>
  </div>

  <div class="bg-white rounded-xl shadow-sm border p-5 mt-8">
    <h2 class="font-semibold">USSD menu structure</h2>
    <pre class="text-sm text-slate-600 mt-3 font-mono leading-relaxed">
CON Welcome to Kwetu
1. Bus tickets
2. Check balance
3. My bookings
4. Insurance
5. Contact support

[1] CON Bus Tickets
    1. Search trips
    2. My bus bookings

[2] CON Your Kwetu wallet
    Balance: ZMW X.XX
    Loyalty: N points (Tier)
    0. Back
    </pre>
  </div>
</div>
<?php html_foot(); ?>
