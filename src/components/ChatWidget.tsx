"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  from: "bot" | "user";
  text: string;
}

const INITIAL: Message[] = [
  { from: "bot", text: "Hi! I'm the Kwetu onboarding assistant. Are you here to book something, or to sell/list on Kwetu?" },
];
const INITIAL_SUGGESTIONS = ["I want to book something", "I want to sell on Kwetu", "What is Kwetu?"];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: "bot", text: data.text }]);
      setSuggestions(data.suggestions || []);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] rounded-xl border border-black/10 bg-white shadow-xl flex flex-col overflow-hidden" style={{ height: 440 }}>
          <div className="bg-kwetu-green text-white px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Kwetu Assistant</div>
              <div className="text-xs text-white/70">Onboarding help for buyers & suppliers</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-kwetu-cream">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${m.from === "user" ? "bg-kwetu-green text-white" : "bg-white border border-black/5 text-slate-700"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-slate-400 px-1">Typing...</div>}
            <div ref={bottomRef} />
          </div>
          {suggestions.length > 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-black/5 bg-white">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-kwetu-green/30 text-kwetu-green hover:bg-kwetu-green/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2 border-t border-black/5 p-2 bg-white"
          >
            <input
              className="input !py-1.5 text-sm"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn-accent !py-1.5 !px-3 text-sm" disabled={sending}>Send</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full h-14 w-14 bg-kwetu-orange text-white shadow-lg flex items-center justify-center text-2xl hover:opacity-90"
        aria-label="Open onboarding chat"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
