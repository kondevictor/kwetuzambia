import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ phone: z.string().min(6) });

/**
 * Simulated SMS OTP send — no real SMS gateway is configured, so the code is
 * deterministic ("123456") the same way MockMoneyProvider deterministically
 * succeeds. This must never be presented as a real SMS integration. See
 * BUILD_GUIDE.md "Non-goals".
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { phone } = parsed.data;

  const code = "123456";
  await prisma.phoneOtp.create({
    data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  return NextResponse.json({ sent: true, devNote: "Simulated SMS — use code 123456 (no real gateway configured)." });
}
