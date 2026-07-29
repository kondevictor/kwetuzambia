"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";

export default function EventsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [method, setMethod] = useState("AIRTEL_MONEY");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/events").then((r) => r.json()).then((d) => setEvents(d.events || []));
  }
  useEffect(load, []);

  async function buy(tierId: string) {
    if (!session?.user) return router.push("/login");
    setBuying(tierId);
    const res = await fetch("/api/events/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketTierId: tierId, quantity: 1, method, msisdnOrCardRef: phone }),
    });
    const data = await res.json();
    setBuying(null);
    if (!res.ok) return setMessage((m) => ({ ...m, [tierId]: data.error || "Failed" }));
    setMessage((m) => ({
      ...m,
      [tierId]: data.status === "SUCCEEDED" ? `Ticket issued! QR: ${data.tickets[0]?.qrCode}` : "Payment failed",
    }));
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Events</h1>
      <div className="card mt-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium">Payment method</label>
          <select className="input mt-1" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="AIRTEL_MONEY">Airtel Money</option>
            <option value="MTN_MONEY">MTN Mobile Money</option>
            <option value="ZAMTEL_KWACHA">Zamtel Kwacha</option>
            <option value="CARD">Card</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Phone / card ref</label>
          <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0977123456" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {events.map((e) => (
          <div key={e.id} className="card">
            <div className="font-semibold flex items-center gap-2">
              {e.name}
              {e.verified && <span className="badge-verified">✓ Verified</span>}
            </div>
            <div className="text-sm text-slate-500">
              {e.venue} · {new Date(e.startsAt).toLocaleString()}
            </div>
            <div className="mt-3 space-y-2">
              {e.ticketTiers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between border-t pt-2">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.remaining} remaining</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-kwetu-green font-semibold">{formatZmw(t.breakdown.totalAmountMinor)}</div>
                    <button
                      className="btn-accent !py-1.5 !px-3"
                      disabled={t.remaining <= 0 || buying === t.id || !phone}
                      onClick={() => buy(t.id)}
                    >
                      {buying === t.id ? "..." : "Buy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(message).some((k) => e.ticketTiers.some((t: any) => t.id === k)) && (
              <div className="mt-2 text-sm text-kwetu-green">
                {e.ticketTiers.map((t: any) => message[t.id] && <div key={t.id}>{message[t.id]}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
