"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";
import { loyaltyTierFor, pointsToNextTier } from "@/lib/loyalty";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetch("/api/me/dashboard").then((r) => r.json()).then(setData);
    }
  }, [status, router]);

  if (!data) return <div className="mx-auto max-w-4xl px-4 py-12">Loading...</div>;

  const tier = loyaltyTierFor(data.wallet.loyaltyPoints);
  const next = pointsToNextTier(data.wallet.loyaltyPoints);
  const tierColor = tier === "Gold" ? "text-amber-500" : tier === "Silver" ? "text-slate-400" : "text-amber-700";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Hi {session?.user?.name?.split(" ")[0]}</h1>

      <div className="grid sm:grid-cols-4 gap-4 mt-6">
        <div className="card">
          <div className="text-xs text-slate-400">Wallet balance</div>
          <div className="text-2xl font-bold text-kwetu-green">{formatZmw(data.wallet.balanceMinor)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">Loyalty points (K-Cash)</div>
          <div className="text-2xl font-bold text-kwetu-orange">{data.wallet.loyaltyPoints}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">Loyalty tier</div>
          <div className={`text-2xl font-bold ${tierColor}`}>{tier}</div>
          <div className="text-xs text-slate-400">
            {next ? `${next.pointsNeeded} pts to ${next.nextTier}` : "Top tier reached"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">Bookings until next fee waiver</div>
          <div className="text-2xl font-bold">{data.wallet.untilNextReward || 5}</div>
          <div className="text-xs text-slate-400">Every 5th booking's service fee is waived</div>
        </div>
      </div>

      <Section title="Bus bookings">
        {data.busBookings.map((b: any) => (
          <Row key={b.id} title={`${b.trip.route.origin} → ${b.trip.route.destination}`} sub={b.status} amount={b.totalMinor} />
        ))}
      </Section>
      <Section title="Stays">
        {data.stayBookings.map((b: any) => (
          <Row key={b.id} title={b.room.property.name} sub={b.status} amount={b.totalMinor} />
        ))}
      </Section>
      <Section title="Event tickets">
        {data.eventTickets.map((t: any) => (
          <Row key={t.id} title={t.ticketTier.event.name} sub={t.qrCode} amount={t.totalMinor} />
        ))}
      </Section>
      <Section title="Service bookings">
        {data.serviceBookings.map((b: any) => (
          <Row key={b.id} title={b.listing.title} sub={b.status} amount={b.totalMinor} />
        ))}
      </Section>
      <Section title="Insurance policies">
        {data.policies.map((p: any) => (
          <Row key={p.id} title={p.quote.productType} sub={p.status} amount={p.quote.premiumMinor} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-semibold text-slate-700">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Row({ title, sub, amount }: { title: string; sub: string; amount: number }) {
  return (
    <div className="card flex justify-between items-center !py-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
      <div className="font-semibold text-kwetu-green">{formatZmw(amount)}</div>
    </div>
  );
}
