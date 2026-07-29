"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-kwetu-green text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Kwetu
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/bus">Bus</Link>
          <Link href="/stays">Stays</Link>
          <Link href="/events">Events</Link>
          <Link href="/services">Services</Link>
          <Link href="/rentals">Rentals</Link>
          <Link href="/land">Land</Link>
          <Link href="/insurance">Insurance</Link>
          <Link href="/partners">Partners</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                {session.user.name?.split(" ")[0]}
              </Link>
              {session.user.role !== "CONSUMER" && (
                <Link href="/supplier" className="hover:underline">
                  Supplier
                </Link>
              )}
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-accent !py-1.5 !px-3">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link href="/register" className="btn-accent !py-1.5 !px-3">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
