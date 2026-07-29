/**
 * Rule-based onboarding assistant. Deterministic keyword matching, no external
 * AI API — consistent with this build's MockMoneyProvider / simulated USSD
 * approach (see BUILD_GUIDE.md "Non-goals"). Answers the common "how do I get
 * started" questions for both consumers and suppliers.
 */

export interface ChatReply {
  text: string;
  suggestions: string[];
}

const CONSUMER_MENU = [
  "How do I book a bus?",
  "How do I pay?",
  "What is the wallet / K-Cash?",
  "How do I become a supplier?",
];

const SUPPLIER_MENU = [
  "How do I list a bus route?",
  "How do I list a property?",
  "What commission do you charge?",
  "How do I get paid?",
];

const GREETING: ChatReply = {
  text: "Hi! I'm the Kwetu onboarding assistant. Are you here to book something, or to sell/list on Kwetu?",
  suggestions: ["I want to book something", "I want to sell on Kwetu", "What is Kwetu?"],
};

function match(input: string, ...keywords: string[]): boolean {
  const lower = input.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function getChatReply(rawInput: string): ChatReply {
  const input = rawInput.trim();
  if (!input) return GREETING;

  if (match(input, "hi", "hello", "hey", "start", "menu")) return GREETING;

  if (match(input, "what is kwetu", "about kwetu", "what is this")) {
    return {
      text: "Kwetu is Zambia's one-stop platform: intercity buses, accommodation, events, local services, property & land listings, and travel insurance — all under one login and one wallet.",
      suggestions: ["I want to book something", "I want to sell on Kwetu"],
    };
  }

  // ---------- Consumer intents ----------
  if (match(input, "book something", "book a bus", "book bus", "how do i book")) {
    return {
      text: "To book a bus: go to Bus in the top menu, search your route, pick a seat, then pay by Airtel/MTN/Zamtel money or card. Every fare shows the base price, Kwetu's service fee, and VAT itemized before you pay — no surprise charges. Stays, Events and Services work the same way from their own menu pages.",
      suggestions: ["How do I pay?", "What is the wallet / K-Cash?", "I want to sell on Kwetu"],
    };
  }

  if (match(input, "how do i pay", "payment", "mobile money", "how do payments work")) {
    return {
      text: "Payments are by Airtel Money, MTN Mobile Money, Zamtel Kwacha, or card — you enter your number/card ref at checkout. In this demo build, payments are simulated (they always succeed unless you enter 0000000000 as the number, which is reserved to demo a failed payment).",
      suggestions: ["What is the wallet / K-Cash?", "How do I book a bus?"],
    };
  }

  if (match(input, "wallet", "k-cash", "loyalty", "reward")) {
    return {
      text: "Every account has a Kwetu wallet. You earn K-Cash loyalty points on every paid booking, and every 5th completed booking has its Kwetu service fee waived automatically. Check your balance and progress on the Dashboard page after logging in.",
      suggestions: ["How do I book a bus?", "I want to sell on Kwetu"],
    };
  }

  // ---------- Supplier intents ----------
  if (match(input, "sell on kwetu", "become a supplier", "list something", "become supplier")) {
    return {
      text: "To sell on Kwetu: register an account and choose 'Supplier' as the account type (or re-register — one login can hold a supplier role). Once logged in, open the Supplier console from the top menu to publish bus trips, properties, events or services. Property and land listings have their own 'List yours' forms on the Rentals and Land pages.",
      suggestions: ["How do I list a bus route?", "What commission do you charge?", "How do I get paid?"],
    };
  }

  if (match(input, "list a bus", "list bus", "add a trip", "publish a trip", "bus route")) {
    return {
      text: "In the Supplier console, open the Bus tab and fill in operator name, route, departure/arrival, fare, bus plate and seat count. Kwetu creates the seat map automatically and locks each seat the instant it's booked, so it can never be oversold.",
      suggestions: ["What commission do you charge?", "How do I get paid?"],
    };
  }

  if (match(input, "list a property", "list property", "add a property", "publish a property", "accommodation listing")) {
    return {
      text: "In the Supplier console, open the Stays tab to add a hotel/lodge/apartment with room types and nightly rates. For long-term rentals, use the Rentals page's 'List your property' form instead — that's a flat placement fee, and rent is paid directly by the tenant to you, never through Kwetu.",
      suggestions: ["What commission do you charge?", "How do I get paid?"],
    };
  }

  if (match(input, "commission", "fee", "how much do you charge", "take rate")) {
    return {
      text: "Kwetu adds its service fee ON TOP of your price — it never reduces what you set. Rates: Bus 7.0%, Accommodation 11.5%, Events 7.5%, Services 8.5%, Insurance 18%, Partner referrals 4.0%. Property and land listings pay a flat placement fee per listing period instead of a percentage — rent/sale proceeds are never touched by Kwetu.",
      suggestions: ["How do I get paid?", "How do I list a bus route?"],
    };
  }

  if (match(input, "get paid", "payout", "settlement", "when do i get money")) {
    return {
      text: "Every booking posts a balanced double-entry ledger transaction: the customer's payment is split between your payable amount and Kwetu's fee. Track your confirmed earnings per vertical in the Supplier console's Overview tab. (Payout automation to your own mobile money account is not wired up in this demo build.)",
      suggestions: ["What commission do you charge?", "I want to book something"],
    };
  }

  return {
    text: "I'm not sure about that one — try one of the topics below, or ask about booking, payments, wallet, becoming a supplier, listing something, commission, or getting paid.",
    suggestions: [...CONSUMER_MENU.slice(0, 2), ...SUPPLIER_MENU.slice(0, 2)],
  };
}
