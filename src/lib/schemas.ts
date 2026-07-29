import { z } from "zod";

// Shared Zod schemas — single source of truth consumed by both API route
// handlers and client forms, to prevent "missing export" / drift failures.

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CONSUMER", "SUPPLIER"]).default("CONSUMER"),
  phone: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const paymentMethodSchema = z.enum(["AIRTEL_MONEY", "MTN_MONEY", "ZAMTEL_KWACHA", "CARD"]);

export const busCheckoutSchema = z.object({
  tripId: z.string(),
  seatNos: z.array(z.string()).min(1),
  passengerName: z.string().min(2),
  method: paymentMethodSchema,
  msisdnOrCardRef: z.string().min(6),
});
export type BusCheckoutInput = z.infer<typeof busCheckoutSchema>;

export const stayCheckoutSchema = z.object({
  roomId: z.string(),
  checkIn: z.string(), // ISO date
  checkOut: z.string(),
  method: paymentMethodSchema,
  msisdnOrCardRef: z.string().min(6),
});
export type StayCheckoutInput = z.infer<typeof stayCheckoutSchema>;

export const eventCheckoutSchema = z.object({
  ticketTierId: z.string(),
  quantity: z.number().int().min(1).max(10),
  method: paymentMethodSchema,
  msisdnOrCardRef: z.string().min(6),
});
export type EventCheckoutInput = z.infer<typeof eventCheckoutSchema>;

export const serviceCheckoutSchema = z.object({
  listingId: z.string(),
  method: paymentMethodSchema,
  msisdnOrCardRef: z.string().min(6),
});
export type ServiceCheckoutInput = z.infer<typeof serviceCheckoutSchema>;

export const rentalListingSchema = z.object({
  title: z.string().min(3),
  city: z.string().min(2),
  monthlyRentMinor: z.number().int().positive(),
  description: z.string().min(10),
  contactPhone: z.string().min(6),
  period: z.enum(["DAYS_7", "DAYS_14", "DAYS_30"]),
});
export type RentalListingInput = z.infer<typeof rentalListingSchema>;

export const landListingSchema = z.object({
  title: z.string().min(3),
  location: z.string().min(2),
  sizeAcres: z.number().positive(),
  priceMinor: z.number().int().positive(),
  description: z.string().min(10),
  contactPhone: z.string().min(6),
});
export type LandListingInput = z.infer<typeof landListingSchema>;

export const insuranceQuoteSchema = z.object({
  productType: z.enum(["TRAVEL", "ACCOMMODATION_ADDON"]),
  tripCostMinor: z.number().int().positive(),
});
export type InsuranceQuoteInput = z.infer<typeof insuranceQuoteSchema>;

export const ussdSchema = z.object({
  sessionId: z.string(),
  text: z.string().default(""),
  phoneNumber: z.string(),
});
export type UssdInput = z.infer<typeof ussdSchema>;
