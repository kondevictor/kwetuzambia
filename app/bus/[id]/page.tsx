"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatZmw } from "@/lib/money";

interface Seat {
  id: string;
  seatNo: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
}
interface TripDetail {
  id: string;
  operator: string;
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  busPlate: string;
  seats: Seat[];
  priceBreakdown: { baseAmountMinor: number; commissionAmountMinor: number; vatAmountMinor: number; totalAmountMinor: number };
}

export default function BusTripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [passengerName, setPassengerName] = useState("");
  const [method, setMethod] = useState("AIRTEL_MONEY");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/bus/trips/${id}`).then((r) => r.json()).then(setTrip);
  }, [id]);

  // Live seat-map refresh: other shoppers' seat picks/bookings show up without
  // a manual reload. If a seat the user had selected got taken by someone
  // else in the meantime, drop it from their selection and flag it.
  const [justLostSeat, setJustLostSeat] = useState<string | null>(null);
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/bus/trips/${id}`);
      if (!res.ok) return;
      const fresh: TripDetail = await res.json();
      setTrip(fresh);
      setSelected((prev) => {
        const stillAvailable = new Set(fresh.seats.filter((s) => s.status === "AVAILABLE").map((s) => s.seatNo));
        const kept = prev.filter((s) => stillAvailable.has(s));
        if (kept.length < prev.length) {
          const lost = prev.find((s) => !kept.includes(s));
          setJustLostSeat(lost || null);
        }
        return kept;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  function toggleSeat(seatNo: string, status: string) {
    if (status !== "AVAILABLE") return;
    setSelected((prev) => (prev.includes(seatNo) ? prev.filter((s) => s !== seatNo) : [...prev, seatNo]));
  }

  async function onCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/bus/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: id,
        seatNos: selected,
        passengerName,
        method,
        msisdnOrCardRef: phone,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Checkout failed");
      return;
    }
    router.push(`/bus/confirmation/${data.bookingId}`);
  }

  if (!trip) return <div className="mx-auto max-w-4xl px-4 py-12">Loading...</div>;

  const total = trip.priceBreakdown.baseAmountMinor * selected.length;
  const fee = trip.priceBreakdown.commissionAmountMinor * selected.length;
  const vat = trip.priceBreakdown.vatAmountMinor * selected.length;
  const grandTotal = total + fee + vat;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <h1 className="text-2xl font-bold text-kwetu-green">
          {trip.origin} → {trip.destination}
        </h1>
        <p className="text-sm text-slate-500">
          {trip.operator} · {trip.busPlate} · {new Date(trip.departAt).toLocaleString()}
        </p>

        {justLostSeat && (
          <div className="mt-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
            Seat {justLostSeat} was just booked by someone else and was removed from your selection.
          </div>
        )}

        <div className="card mt-6">
          <div className="font-semibold mb-3 flex items-center justify-between">
            <span>Select your seat(s)</span>
            <span className="text-xs font-normal text-slate-400">Live — updates every 5s</span>
          </div>
          <div className="grid grid-cols-4 gap-2 max-w-xs">
            {trip.seats.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeat(s.seatNo, s.status)}
                disabled={s.status !== "AVAILABLE"}
                className={`rounded-md py-2 text-xs font-medium border ${
                  selected.includes(s.seatNo)
                    ? "bg-kwetu-green text-white border-kwetu-green"
                    : s.status === "AVAILABLE"
                    ? "bg-white hover:bg-kwetu-cream border-black/10"
                    : "bg-slate-200 text-slate-400 border-transparent cursor-not-allowed"
                }`}
              >
                {s.seatNo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card h-fit">
        <div className="font-semibold">Fare breakdown</div>
        <dl className="mt-2 text-sm space-y-1">
          <div className="flex justify-between"><dt>Fare × {selected.length || 0}</dt><dd>{formatZmw(total)}</dd></div>
          <div className="flex justify-between text-slate-500"><dt>Service fee (7.0%)</dt><dd>{formatZmw(fee)}</dd></div>
          <div className="flex justify-between text-slate-500"><dt>VAT on fee (16%)</dt><dd>{formatZmw(vat)}</dd></div>
          <div className="flex justify-between font-bold border-t pt-1 mt-1"><dt>Total</dt><dd>{formatZmw(grandTotal)}</dd></div>
        </dl>

        <form onSubmit={onCheckout} className="mt-4 space-y-3">
          <input
            className="input"
            placeholder="Passenger full name"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            required
          />
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="AIRTEL_MONEY">Airtel Money</option>
            <option value="MTN_MONEY">MTN Mobile Money</option>
            <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
            <option value="CARD">Card</option>
          </select>
          <input
            className="input"
            placeholder="Phone / card ref e.g. 0977123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-accent w-full" disabled={selected.length === 0 || submitting}>
            {submitting ? "Processing..." : `Pay ${formatZmw(grandTotal)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
