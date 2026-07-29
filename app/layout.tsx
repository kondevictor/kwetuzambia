import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "Kwetu — Everything You Need, Right Here.",
  description:
    "Kwetu Zambia: buses, accommodation, events, services, property, land, insurance and rides — all in one place.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B5D3B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">
        <Providers>
          <Nav />
          <main>{children}</main>
          <footer className="mt-16 border-t border-black/5 py-8 text-center text-sm text-slate-500">
            Kwetu Zambia — demo build. Payments and USSD are simulated. See BUILD_GUIDE.md.
          </footer>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
