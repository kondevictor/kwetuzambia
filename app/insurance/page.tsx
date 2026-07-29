"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { formatZmw } from "@/lib/money";

export default function InsurancePage() {
  const { data: session } = useSession();
  const [productType, setProductType] = useState<"TRAVEL" | "ACCOMMODATION_ADDON">("TRAVEL");
  const [tripCost, setTripCost] = useState(500);
  const [quote, setQuote] = useState<any>(null);
  const [method, setMethod] = useState("AIRTEL_MONEY");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function getQuote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/insurance/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productType, tripCostMinor: Math.round(tripCost * 100) }),
    });
    setQuote(await res.json());
    setLoading(false);
  }

  async function bind() {
    setLoading(true);
    const res = await fetch("/api/insurance/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: quote.id, method, msisdnOrCardRef: phone }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Travel & micro-insurance</h1>
      <p className="text-sm text-slate-500 mt-1">
        This add-on is normally embedded at bus/accommodation checkout — this page demonstrates the standalone
        quote-bind-claim flow.
      </p>

      {!quote && (
        <form onSubmit={getQuote} className="card mt-6 space-y-3">
          <select className="input" value={productType} onChange={(e) => setProductType(e.target.value as any)}>
            <option value="TRAVEL">Travel insurance</option>
            <option value="ACCOMMODATION_ADDON">Accommodation booking protection</option>
          </select>
          <input
            className="input"
            type="number"
            placeholder="Trip / booking cost (ZMW)"
            value={tripCost}
            onChange={(e) => setTripCost(Number(e.target.value))}
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Quoting..." : "Get quote"}
          </button>
        </form>
      )}

      {quote && !result && (
        <div className="card mt-6 space-y-3">
          <p className="text-sm">{quote.coverageSummary}</p>
          <div className="text-lg font-bold text-kwetu-green">Premium: {formatZmw(quote.breakdown.totalAmountMinor)}</div>
          <div className="text-xs text-slate-400">
            base {formatZmw(quote.breakdown.baseAmountMinor)} + agency commission {formatZmw(quote.breakdown.commissionAmountMinor)} + VAT{" "}
            {formatZmw(quote.breakdown.vatAmountMinor)}
          </div>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="AIRTEL_MONEY">Airtel Money</option>
            <option value="MTN_MONEY">MTN Mobile Money</option>
            <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
            <option value="CARD">Card</option>
          </select>
          <input className="input" placeholder="Phone / card ref" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button
            className="btn-accent w-full"
            disabled={!session?.user || !phone || loading}
            onClick={bind}
          >
            {!session?.user ? "Log in to bind policy" : loading ? "Processing..." : "Bind policy & pay"}
          </button>
        </div>
      )}

      {result && (
        <div className="card mt-6 text-center">
          <div className="text-4xl">{result.status === "SUCCEEDED" ? "✅" : "⚠️"}</div>
          <p className="mt-2 font-semibold">
            {result.status === "SUCCEEDED" ? "Policy bound!" : "Payment failed"}
          </p>
          {result.policy && <p className="text-sm text-slate-500">Policy ID: {result.policy.id}</p>}
        </div>
      )}
    </div>
  );
}
