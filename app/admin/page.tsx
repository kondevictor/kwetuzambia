"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatZmw } from "@/lib/money";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [forbidden, setForbidden] = useState(false);

  function loadOperators() {
    fetch("/api/admin/operators").then((r) => r.json()).then((d) => setOperators(d.operators || []));
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetch("/api/admin/summary").then(async (r) => {
        if (r.status === 403) return setForbidden(true);
        setData(await r.json());
      });
      loadOperators();
    }
  }, [status, router]);

  async function toggleVerify(id: string) {
    await fetch(`/api/admin/operators/${id}/verify`, { method: "POST" });
    loadOperators();
  }

  if (forbidden) return <div className="mx-auto max-w-3xl px-4 py-12">Admin access only.</div>;
  if (!data) return <div className="mx-auto max-w-3xl px-4 py-12">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Admin — cross-vertical overview</h1>

      <div className="grid sm:grid-cols-4 gap-4 mt-6">
        <Stat label="GMV" value={formatZmw(data.gmvMinor)} />
        <Stat label="Kwetu revenue (commission)" value={formatZmw(data.revenueMinor)} />
        <Stat label="VAT payable" value={formatZmw(data.vatMinor)} />
        <Stat label="Take rate" value={`${data.takeRatePct.toFixed(2)}%`} />
        <Stat label="Users" value={String(data.userCount)} />
        <Stat label="Operators" value={String(data.operatorCount)} />
        <Stat label="Reconciliation exceptions" value={String(data.reconciliationExceptionsCount)} highlight={data.reconciliationExceptionsCount > 0} />
      </div>

      <h2 className="font-semibold mt-8">GMV & revenue by vertical</h2>
      <div className="mt-2 space-y-2">
        {Object.entries(data.byVertical).map(([vertical, v]: any) => (
          <div key={vertical} className="card flex justify-between !py-3">
            <div className="font-medium">{vertical}</div>
            <div className="text-sm text-slate-500">{v.count} transactions</div>
            <div className="font-semibold text-kwetu-green">{formatZmw(v.gmv)} GMV / {formatZmw(v.revenue)} revenue</div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mt-8">Bus operators — verification</h2>
      <div className="mt-2 space-y-2">
        {operators.map((o) => (
          <div key={o.id} className="card flex justify-between items-center !py-3">
            <div>
              <div className="font-medium flex items-center gap-2">
                {o.name}
                {o.verified && <span className="badge-verified">✓ Verified</span>}
              </div>
              <div className="text-xs text-slate-400">
                {o.owner.name} · {o.owner.email} {o.owner.phone ? `· ${o.owner.phone}` : ""} · {o.routeCount} routes ·{" "}
                {o.tripCount} trips
              </div>
            </div>
            <button
              onClick={() => toggleVerify(o.id)}
              className={o.verified ? "btn-accent !py-1.5 !px-3" : "btn-primary !py-1.5 !px-3"}
            >
              {o.verified ? "Unverify" : "Verify"}
            </button>
          </div>
        ))}
        {operators.length === 0 && <p className="text-slate-500 text-sm">No operators registered yet.</p>}
      </div>

      <h2 className="font-semibold mt-8">Recent ledger transactions (reconciliation view)</h2>
      <div className="mt-2 space-y-2">
        {data.recentTransactions.map((t: any) => (
          <div key={t.id} className="card flex justify-between !py-3">
            <div>
              <div className="font-medium">{t.description}</div>
              <div className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()} · {t.lines} lines</div>
            </div>
            <div className={`text-sm font-medium ${t.balanced ? "text-kwetu-green" : "text-red-600"}`}>
              {t.balanced ? "Balanced" : "EXCEPTION"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-red-600" : "text-kwetu-green"}`}>{value}</div>
    </div>
  );
}
