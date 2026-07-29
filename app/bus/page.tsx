"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BusSearchPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("Lusaka");
  const [destination, setDestination] = useState("Ndola");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/bus/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">Search intercity buses</h1>
      <form onSubmit={onSubmit} className="card mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-sm font-medium">From</label>
          <input className="input mt-1" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <input className="input mt-1" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <p className="text-sm text-slate-500 mt-4">Try Lusaka–Ndola, Lusaka–Livingstone, or Lusaka–Kitwe.</p>
    </div>
  );
}
