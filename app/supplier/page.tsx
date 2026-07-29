"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";

type Tab = "overview" | "bus" | "bulk" | "stays" | "events" | "services" | "payouts";

export default function SupplierConsole() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<any>(null);
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/supplier/summary").then((r) => r.json()).then(setSummary);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if ((session?.user as any)?.role === "CONSUMER") {
        setMsg("Your account is a consumer account. Register a supplier account to access the console.");
      } else {
        load();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (msg) return <div className="mx-auto max-w-3xl px-4 py-12">{msg}</div>;
  if (!summary) return <div className="mx-auto max-w-3xl px-4 py-12">Loading...</div>;

  const tabs: Tab[] = ["overview", "bus", "bulk", "stays", "events", "services", "payouts"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Supplier console</h1>
      <div className="flex gap-2 mt-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${tab === t ? "bg-kwetu-green text-white" : "bg-white border"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <Stat label="Bus earnings (confirmed)" value={formatZmw(summary.earnings.bus)} />
          <Stat label="Stays earnings (confirmed)" value={formatZmw(summary.earnings.stays)} />
          <Stat label="Services earnings (confirmed)" value={formatZmw(summary.earnings.services)} />
          <p className="sm:col-span-3 text-xs text-slate-400 mt-2">
            Earnings shown are the base amount you set (commission is added on top and paid separately as
            Kwetu&apos;s fee — see BUILD_GUIDE.md for the reconciliation model).
          </p>
        </div>
      )}

      {tab === "bus" && <BusTab reload={load} />}
      {tab === "bulk" && <BulkUploadTab reload={load} />}
      {tab === "stays" && <StaysTab reload={load} />}
      {tab === "events" && <EventsTab reload={load} />}
      {tab === "services" && <ServicesTab reload={load} />}
      {tab === "payouts" && <PayoutsTab />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xl font-bold text-kwetu-green">{value}</div>
    </div>
  );
}

function BusTab({ reload }: { reload: () => void }) {
  const [form, setForm] = useState({
    operatorName: "",
    origin: "",
    destination: "",
    departAt: "",
    arriveAt: "",
    basePriceMinor: 0,
    busPlate: "",
    totalSeats: 44,
  });
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/supplier/bus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, basePriceMinor: Math.round(form.basePriceMinor * 100) }),
    });
    setStatus(res.ok ? "Trip published!" : "Failed to publish trip");
    if (res.ok) reload();
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 max-w-md">
      <h2 className="font-semibold">Add a trip</h2>
      <input className="input" placeholder="Operator name" value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required />
        <input className="input" placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="input" type="datetime-local" value={form.departAt} onChange={(e) => setForm({ ...form, departAt: e.target.value })} required />
        <input className="input" type="datetime-local" value={form.arriveAt} onChange={(e) => setForm({ ...form, arriveAt: e.target.value })} required />
      </div>
      <input className="input" type="number" placeholder="Base fare (ZMW)" value={form.basePriceMinor || ""} onChange={(e) => setForm({ ...form, basePriceMinor: Number(e.target.value) })} required />
      <input className="input" placeholder="Bus plate" value={form.busPlate} onChange={(e) => setForm({ ...form, busPlate: e.target.value })} required />
      <input className="input" type="number" placeholder="Total seats" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: Number(e.target.value) })} />
      <button className="btn-primary w-full">Publish trip</button>
      {status && <p className="text-sm text-kwetu-green">{status}</p>}
    </form>
  );
}

function StaysTab({ reload }: { reload: () => void }) {
  const [form, setForm] = useState({ name: "", city: "", description: "", roomType: "", ratePerNightMinor: 0, quantity: 1 });
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/supplier/property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ratePerNightMinor: Math.round(form.ratePerNightMinor * 100) }),
    });
    setStatus(res.ok ? "Property published!" : "Failed");
    if (res.ok) reload();
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 max-w-md">
      <h2 className="font-semibold">Add a property</h2>
      <input className="input" placeholder="Property name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
      <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <input className="input" placeholder="Room type e.g. Standard Double" value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })} required />
      <input className="input" type="number" placeholder="Rate per night (ZMW)" value={form.ratePerNightMinor || ""} onChange={(e) => setForm({ ...form, ratePerNightMinor: Number(e.target.value) })} required />
      <button className="btn-primary w-full">Publish property</button>
      {status && <p className="text-sm text-kwetu-green">{status}</p>}
    </form>
  );
}

function EventsTab({ reload }: { reload: () => void }) {
  const [form, setForm] = useState({ name: "", venue: "", startsAt: "", tierName: "General", priceMinor: 0, quantity: 100 });
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/supplier/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, priceMinor: Math.round(form.priceMinor * 100) }),
    });
    setStatus(res.ok ? "Event published!" : "Failed");
    if (res.ok) reload();
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 max-w-md">
      <h2 className="font-semibold">Add an event</h2>
      <input className="input" placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="input" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required />
      <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
      <input className="input" placeholder="Ticket tier name" value={form.tierName} onChange={(e) => setForm({ ...form, tierName: e.target.value })} required />
      <input className="input" type="number" placeholder="Ticket price (ZMW)" value={form.priceMinor || ""} onChange={(e) => setForm({ ...form, priceMinor: Number(e.target.value) })} required />
      <input className="input" type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
      <button className="btn-primary w-full">Publish event</button>
      {status && <p className="text-sm text-kwetu-green">{status}</p>}
    </form>
  );
}

function BulkUploadTab({ reload }: { reload: () => void }) {
  const [operatorName, setOperatorName] = useState("");
  const [csv, setCsv] = useState(
    "origin,destination,departAt,arriveAt,basePriceZmw,busPlate,totalSeats\nLusaka,Kabwe,2026-08-10T07:00,2026-08-10T09:00,120,BAZ 9001,44\nLusaka,Kabwe,2026-08-10T13:00,2026-08-10T15:00,120,BAZ 9002,44"
  );
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/supplier/bus/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorName, csv }),
    });
    const data = await res.json();
    setSubmitting(false);
    setResult(data);
    if (res.ok) reload();
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 max-w-2xl">
      <h2 className="font-semibold">Bulk manifest upload</h2>
      <p className="text-sm text-slate-500">
        Paste a full manifest instead of adding trips one at a time. Header row required; columns: origin,
        destination, departAt, arriveAt, basePriceZmw, busPlate, totalSeats.
      </p>
      <input className="input" placeholder="Operator name" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} required />
      <textarea
        className="input font-mono text-xs"
        rows={8}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        required
      />
      <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Uploading..." : "Upload manifest"}</button>
      {result && (
        <div className="text-sm space-y-1">
          {result.createdCount != null && (
            <p className="text-kwetu-green">{result.createdCount} trip(s) published.</p>
          )}
          {result.errors?.length > 0 && (
            <ul className="text-red-600 list-disc list-inside">
              {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {result.error && <p className="text-red-600">{JSON.stringify(result.error)}</p>}
        </div>
      )}
    </form>
  );
}

function PayoutsTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/supplier/payouts").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="mt-6 text-slate-500">Loading payouts...</div>;

  return (
    <div className="mt-6">
      <div className="card">
        <div className="text-xs text-slate-400">Total payable to you (confirmed, all verticals)</div>
        <div className="text-2xl font-bold text-kwetu-green">{formatZmw(data.totalPayableMinor)}</div>
        <p className="text-xs text-slate-400 mt-1">
          This is the base amount customers agreed to pay you — Kwetu's commission and VAT are excluded, as they're
          Kwetu's own revenue, never yours.
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {data.items.map((item: any, i: number) => (
          <div key={i} className="card flex justify-between items-center !py-3">
            <div>
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-slate-400">
                {item.vertical} · {item.customer} · {new Date(item.date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-kwetu-green">{formatZmw(item.payableToYouMinor)}</div>
              <div className="text-xs text-slate-400">customer paid {formatZmw(item.totalPaidMinor)}</div>
            </div>
          </div>
        ))}
        {data.items.length === 0 && <p className="text-slate-500 text-sm">No confirmed transactions yet.</p>}
      </div>
    </div>
  );
}

function ServicesTab({ reload }: { reload: () => void }) {
  const [form, setForm] = useState({ title: "", category: "", description: "", priceMinor: 0 });
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/supplier/service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, priceMinor: Math.round(form.priceMinor * 100) }),
    });
    setStatus(res.ok ? "Service listed!" : "Failed");
    if (res.ok) reload();
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3 max-w-md">
      <h2 className="font-semibold">Add a service</h2>
      <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
      <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <input className="input" type="number" placeholder="Price (ZMW)" value={form.priceMinor || ""} onChange={(e) => setForm({ ...form, priceMinor: Number(e.target.value) })} required />
      <button className="btn-primary w-full">Publish service</button>
      {status && <p className="text-sm text-kwetu-green">{status}</p>}
    </form>
  );
}
