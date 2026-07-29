"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";

interface Result {
  id: string;
  operator: string;
  operatorVerified: boolean;
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  availableSeats: number;
  priceBreakdown: { baseAmountMinor: number; commissionAmountMinor: number; vatAmountMinor: number; totalAmountMinor: number };
}

export default function BusResultsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12">Loading...</div>}>
      <BusResultsInner />
    </Suspense>
  );
}

function BusResultsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const origin = params.get("origin") || "";
    const destination = params.get("destination") || "";
    fetch(`/api/bus/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results || []))
      .finally(() => setLoading(false));
  }, [params]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">
        {params.get("origin")} → {params.get("destination")}
      </h1>
      {loading && <p className="mt-6 text-slate-500">Searching...</p>}
      {!loading && results.length === 0 && <p className="mt-6 text-slate-500">No trips found.</p>}
      <div className="mt-6 space-y-4">
        {results.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/bus/${r.id}`)}
            className="card w-full text-left hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {r.operator}
                  {r.operatorVerified && <span className="badge-verified">✓ Verified</span>}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(r.departAt).toLocaleString()} → {new Date(r.arriveAt).toLocaleTimeString()}
                </div>
                <div className="text-sm text-slate-500">{r.availableSeats} seats left</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-kwetu-green">{formatZmw(r.priceBreakdown.totalAmountMinor)}</div>
                <div className="text-xs text-slate-400">
                  fare {formatZmw(r.priceBreakdown.baseAmountMinor)} + fee {formatZmw(r.priceBreakdown.commissionAmountMinor)} + VAT{" "}
                  {formatZmw(r.priceBreakdown.vatAmountMinor)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
