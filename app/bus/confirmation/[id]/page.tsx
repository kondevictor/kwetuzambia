"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatZmw } from "@/lib/money";

export default function BusConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/bus/booking/${id}`).then((r) => r.json()).then(setBooking);
  }, [id]);

  if (!booking) return <div className="mx-auto max-w-lg px-4 py-12">Loading...</div>;

  const confirmed = booking.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="card text-center">
        <div className="text-4xl">{confirmed ? "✅" : "⚠️"}</div>
        <h1 className="text-xl font-bold mt-2">{confirmed ? "Booking confirmed!" : "Booking not completed"}</h1>
        <p className="text-slate-500 mt-1">Booking reference: {booking.id}</p>
        <div className="mt-4 text-left text-sm space-y-1">
          <div><strong>Route:</strong> {booking.trip.route.origin} → {booking.trip.route.destination}</div>
          <div><strong>Operator:</strong> {booking.trip.route.operator.name}</div>
          <div><strong>Departs:</strong> {new Date(booking.trip.departAt).toLocaleString()}</div>
          <div><strong>Passenger:</strong> {booking.passengerName}</div>
          <div><strong>Seats:</strong> {booking.seats.map((s: any) => s.seatNo).join(", ")}</div>
          <div><strong>Total paid:</strong> {formatZmw(booking.totalMinor)}</div>
          {booking.feeWaived && <div className="text-kwetu-green font-medium">🎉 Loyalty reward: service fee waived on this booking!</div>}
        </div>
      </div>
    </div>
  );
}
