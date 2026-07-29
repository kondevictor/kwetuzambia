"use client";

import { useEffect, useState } from "react";

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/partners").then((r) => r.json()).then((d) => setPartners(d.partners || []));
  }, []);

  async function go(id: string) {
    const res = await fetch(`/api/partners/${id}/click`, { method: "POST" });
    const data = await res.json();
    if (data.outboundUrl) window.open(data.outboundUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Rides, food & parcel partners</h1>
      <p className="text-sm text-slate-500 mt-1">
        Outbound referral links — Kwetu earns a 4.0% referral commission on attributed bookings.
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {partners.map((p) => (
          <button key={p.id} onClick={() => go(p.id)} className="card text-left hover:shadow-md transition-shadow">
            <div className="font-semibold">{p.name}</div>
            <div className="text-xs text-slate-400">{p.category}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
