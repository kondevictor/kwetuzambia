import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const partners = await prisma.referralPartner.findMany();
  return NextResponse.json({ partners });
}
