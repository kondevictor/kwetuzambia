import Link from "next/link";

const otherVerticals = [
  { href: "/stays", emoji: "🏨", title: "Accommodation", desc: "Hotels, lodges & apartments." },
  { href: "/events", emoji: "🎟️", title: "Events", desc: "Football, concerts, exhibitions." },
  { href: "/services", emoji: "🛠️", title: "Local Services", desc: "Hire vetted local providers." },
  { href: "/rentals", emoji: "🏠", title: "Property Rentals", desc: "Find a place to rent." },
  { href: "/land", emoji: "🌍", title: "Land Sales", desc: "Browse verified land listings." },
  { href: "/insurance", emoji: "🛡️", title: "Travel Insurance", desc: "Quote & bind micro-insurance." },
  { href: "/partners", emoji: "🔗", title: "Rides, Food & Parcel", desc: "Jump to trusted partners." },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-kwetu-green to-kwetu-greenDark text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Everything You Need, <span className="text-kwetu-orangeLight">Right Here.</span>
          </h1>
          <p className="mt-4 text-white/80 max-w-2xl mx-auto">
            Start with Zambia&apos;s most reliable way to book an intercity bus seat — transparent pricing,
            secure mobile-money checkout, a guaranteed seat.
          </p>
          <Link
            href="/bus"
            className="inline-flex items-center gap-2 mt-6 bg-kwetu-orange hover:opacity-90 text-white font-semibold rounded-lg px-6 py-3 text-lg transition-opacity"
          >
            🚌 Book a bus ticket
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 -mt-8 pb-8">
        <Link href="/bus" className="card block hover:shadow-md transition-shadow border-2 border-kwetu-green/20">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🚌</div>
            <div>
              <div className="font-bold text-lg text-kwetu-green">Intercity Bus — book now</div>
              <div className="text-sm text-slate-500 mt-1">
                Real seat maps, inventory locks so a seat can never be sold twice, itemized fares, mobile-money
                checkout. This is where Kwetu is strongest today.
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Also available</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {otherVerticals.map((v) => (
            <Link key={v.href} href={v.href} className="card hover:shadow-md transition-shadow">
              <div className="text-3xl">{v.emoji}</div>
              <div className="mt-2 font-semibold">{v.title}</div>
              <div className="text-sm text-slate-500 mt-1">{v.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
