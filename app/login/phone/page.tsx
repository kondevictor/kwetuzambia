"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PhoneLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devNote, setDevNote] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Could not send code"); return; }
    setDevNote(data.devNote || "");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("phone-otp", { phone, code, name, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Invalid or expired code"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-kwetu-green">Sign in with your phone</h1>
      <p className="text-sm text-slate-500 mt-1">
        No password to remember — we&apos;ll text you a one-time code.
      </p>

      {step === "phone" && (
        <form onSubmit={requestCode} className="card mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Phone number</label>
            <input className="input mt-1" placeholder="0977123456" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Name (only needed for new accounts)</label>
            <input className="input mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Sending code..." : "Send code"}</button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode} className="card mt-6 space-y-4">
          <p className="text-sm text-slate-500">Code sent to {phone}.</p>
          {devNote && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">{devNote}</p>}
          <div>
            <label className="text-sm font-medium">6-digit code</label>
            <input className="input mt-1" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Verifying..." : "Verify & sign in"}</button>
          <button type="button" className="text-sm text-slate-500 underline" onClick={() => setStep("phone")}>
            Use a different number
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-slate-500">
        Prefer email? <Link className="text-kwetu-green underline" href="/login">Sign in with email</Link>
      </p>
    </div>
  );
}
