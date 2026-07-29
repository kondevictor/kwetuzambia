"use client";

import { useState } from "react";

export default function UssdSimulatorPage() {
  const [sessionId] = useState(() => `sess-${Date.now()}`);
  const [history, setHistory] = useState<string[]>([]);
  const [textStack, setTextStack] = useState("");
  const [screen, setScreen] = useState("Dial *384*1# to start");
  const [input, setInput] = useState("");
  const [active, setActive] = useState(false);

  async function send(nextText: string) {
    const res = await fetch("/api/ussd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text: nextText, phoneNumber: "0977000000" }),
    });
    const data = await res.json();
    setScreen(data.response.replace(/^CON |^END /, ""));
    setActive(data.continueSession);
    setHistory((h) => [...h, data.response]);
  }

  function start() {
    setTextStack("");
    setActive(true);
    send("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = textStack ? `${textStack}*${input}` : input;
    setTextStack(next);
    setInput("");
    send(next);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-kwetu-green">USSD simulator</h1>
      <p className="text-sm text-slate-500 mt-1">
        Simulates a feature-phone USSD session (e.g. *384*1#). Not a real telco gateway — see BUILD_GUIDE.md.
      </p>

      <div className="card mt-6 bg-black text-green-400 font-mono text-sm whitespace-pre-wrap min-h-[140px]">
        {screen}
      </div>

      {!active ? (
        <button className="btn-primary w-full mt-4" onClick={start}>
          Dial *384#
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter option" />
          <button className="btn-accent">Send</button>
        </form>
      )}
    </div>
  );
}
