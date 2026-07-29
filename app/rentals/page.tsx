"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatZmw } from "@/lib/money";

export default function RentalsPage() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    city: "",
    monthlyRentMinor: 0,
    description: "",
    contactPhone: "",
    period: "DAYS_14",
  });
  const [creating, setCreating] = useState(false);
  const [newListing, setNewListing] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("AIRTEL_MONEY");
  const [payPhone, setPayPhone] = useState("");
  const [payMsg, setPayMsg] = useState("");

  function load() {
    fetch("/api/rentals").then((r) => r.json()).then((d) => setListings(d.listings || []));
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monthlyRentMinor: Math.round(form.monthlyRentMinor * 100) }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) setNewListing(data);
  }

  async function payFee() {
    const res = await fetch(`/api/rentals/${newListing.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: payMethod, msisdnOrCardRef: payPhone }),
    });
    const data = await res.json();
    setPayMsg(data.status === "SUCCEEDED" ? "Placement fee paid — your listing is live!" : "Payment failed");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Property rentals</h1>
      <p className="text-sm text-slate-500 mt-1">
        Tenants pay landlords directly — Kwetu never touches rent. Landlords pay a flat placement fee to list.
      </p>

      <div className="mt-6 space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="card">
            <div className="font-semibold flex items-center gap-2">
              {l.title}
              {l.paidUntil && new Date(l.paidUntil) > new Date() && <span className="badge-verified">Live listing</span>}
            </div>
            <div className="text-sm text-slate-500">{l.city}</div>
            <div className="text-sm">{l.description}</div>
            <div className="mt-1 font-semibold text-kwetu-green">{formatZmw(l.monthlyRentMinor)}/month</div>
            <div className="text-xs text-slate-400">Contact landlord directly: {l.contactPhone}</div>
          </div>
        ))}
      </div>

      <div className="card mt-10">
        <h2 className="font-semibold">List your property</h2>
        {!session?.user && <p className="text-sm text-slate-500 mt-1">Log in to list a property.</p>}
        {session?.user && !newListing && (
          <form onSubmit={submit} className="mt-3 space-y-3">
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <input
              className="input"
              type="number"
              placeholder="Monthly rent (ZMW)"
              value={form.monthlyRentMinor || ""}
              onChange={(e) => setForm({ ...form, monthlyRentMinor: Number(e.target.value) })}
              required
            />
            <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <input className="input" placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} required />
            <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
              <option value="DAYS_7">7 days — ZMW 50</option>
              <option value="DAYS_14">14 days — ZMW 85</option>
              <option value="DAYS_30">30 days — ZMW 150</option>
            </select>
            <button className="btn-primary w-full" disabled={creating}>
              {creating ? "Creating..." : "Create listing"}
            </button>
          </form>
        )}
        {newListing && !payMsg && (
          <div className="mt-3 space-y-3">
            <p className="text-sm">
              Listing created. Pay the placement fee ({formatZmw(newListing.placementFeeMinor)}) to publish it.
            </p>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="MTN_MONEY">MTN Mobile Money</option>
              <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
              <option value="CARD">Card</option>
            </select>
            <input className="input" placeholder="Phone / card ref" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
            <button className="btn-accent w-full" onClick={payFee} disabled={!payPhone}>
              Pay placement fee
            </button>
          </div>
        )}
        {payMsg && <p className="mt-3 text-kwetu-green font-medium">{payMsg}</p>}
      </div>
    </div>
  );
}
