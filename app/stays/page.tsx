"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatZmw } from "@/lib/money";

export default function StaysPage() {
  const [city, setCity] = useState("Livingstone");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(c: string) {
    setLoading(true);
    const r = await fetch(`/api/stays/search?city=${encodeURIComponent(c)}`);
    const data = await r.json();
    setResults(data.results || []);
    setLoading(false);
  }

  useEffect(() => {
    search(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Accommodation</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(city);
        }}
        className="mt-4 flex gap-2"
      >
        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City e.g. Livingstone" />
        <button className="btn-primary">Search</button>
      </form>

      {loading && <p className="mt-6 text-slate-500">Searching...</p>}
      <div className="mt-6 space-y-4">
        {results.map((p) => (
          <Link key={p.id} href={`/stays/${p.id}`} className="card block hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {p.name}
                  {p.verified && <span className="badge-verified">✓ Verified</span>}
                </div>
                <div className="text-sm text-slate-500">{p.city}</div>
                <div className="text-sm text-slate-500 mt-1">{p.description}</div>
              </div>
              {p.fromBreakdown && (
                <div className="text-right">
                  <div className="text-xs text-slate-400">from</div>
                  <div className="font-bold text-kwetu-green">{formatZmw(p.fromBreakdown.totalAmountMinor)}/night</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
