"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";

export default function ServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [method, setMethod] = useState("AIRTEL_MONEY");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/services").then((r) => r.json()).then((d) => setListings(d.listings || []));
  }, []);

  async function book(id: string) {
    if (!session?.user) return router.push("/login");
    setBusy(id);
    const res = await fetch("/api/services/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id, method, msisdnOrCardRef: phone }),
    });
    const data = await res.json();
    setBusy(null);
    setMsg((m) => ({ ...m, [id]: res.ok ? (data.status === "SUCCEEDED" ? "Booked!" : "Payment failed") : data.error }));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Local services</h1>
      <div className="card mt-4 grid grid-cols-2 gap-3">
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="AIRTEL_MONEY">Airtel Money</option>
          <option value="MTN_MONEY">MTN Mobile Money</option>
          <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
          <option value="CARD">Card</option>
        </select>
        <input className="input" placeholder="Phone / card ref" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="mt-6 space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="card flex justify-between items-center">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {l.title}
                {l.verified && <span className="badge-verified">✓ Verified</span>}
              </div>
              <div className="text-xs text-slate-400">{l.category}</div>
              <div className="text-sm text-slate-500">{l.description}</div>
              {msg[l.id] && <div className="text-sm text-kwetu-green mt-1">{msg[l.id]}</div>}
            </div>
            <div className="text-right">
              <div className="font-semibold text-kwetu-green">{formatZmw(l.breakdown.totalAmountMinor)}</div>
              <button className="btn-accent !py-1.5 !px-3 mt-1" disabled={busy === l.id || !phone} onClick={() => book(l.id)}>
                {busy === l.id ? "..." : "Book"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
