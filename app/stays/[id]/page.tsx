"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatZmw } from "@/lib/money";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [property, setProperty] = useState<any>(null);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [method, setMethod] = useState("AIRTEL_MONEY");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/stays/property/${id}`).then((r) => r.json()).then((p) => {
      setProperty(p);
      if (p.rooms?.[0]) setRoomId(p.rooms[0].id);
    });
  }, [id]);

  async function onCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return router.push("/login");
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/stays/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, checkIn, checkOut, method, msisdnOrCardRef: phone }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Checkout failed");
    setResult(data);
  }

  if (!property) return <div className="mx-auto max-w-3xl px-4 py-12">Loading...</div>;

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="card text-center">
          <div className="text-4xl">{result.status === "SUCCEEDED" ? "✅" : "⚠️"}</div>
          <h1 className="text-xl font-bold mt-2">
            {result.status === "SUCCEEDED" ? "Stay booked!" : "Payment failed"}
          </h1>
          <p className="text-slate-500">Booking reference: {result.bookingId}</p>
          {result.status === "SUCCEEDED" && (
            <p className="mt-2">Total paid: {formatZmw(result.breakdown.totalAmountMinor)}</p>
          )}
        </div>
      </div>
    );
  }

  const selectedRoom = property.rooms.find((r: any) => r.id === roomId);
  const nights =
    checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <h1 className="text-2xl font-bold text-kwetu-green">{property.name}</h1>
        <p className="text-slate-500">{property.city}</p>
        <p className="mt-4">{property.description}</p>
        <div className="mt-6 space-y-2">
          {property.rooms.map((r: any) => (
            <label key={r.id} className="card flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input type="radio" name="room" checked={roomId === r.id} onChange={() => setRoomId(r.id)} />
                <span>{r.type}</span>
              </div>
              <span className="font-semibold text-kwetu-green">{formatZmw(r.breakdown.totalAmountMinor)}/night</span>
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={onCheckout} className="card h-fit space-y-3">
        <div>
          <label className="text-sm font-medium">Check-in</label>
          <input type="date" className="input mt-1" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Check-out</label>
          <input type="date" className="input mt-1" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
        </div>
        {selectedRoom && (
          <div className="text-sm text-slate-600">
            {nights} night(s) × {formatZmw(selectedRoom.breakdown.totalAmountMinor)} ={" "}
            <strong>{formatZmw(selectedRoom.breakdown.totalAmountMinor * nights)}</strong>
          </div>
        )}
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="AIRTEL_MONEY">Airtel Money</option>
          <option value="MTN_MONEY">MTN Mobile Money</option>
          <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
          <option value="CARD">Card</option>
        </select>
        <input className="input" placeholder="Phone / card ref" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-accent w-full" disabled={submitting}>
          {submitting ? "Processing..." : "Book & pay"}
        </button>
      </form>
    </div>
  );
}
