import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runRefund } from "@/lib/checkout";
import { z } from "zod";

const bodySchema = z.object({ reason: z.string().min(3) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const refund = await runRefund({
      paymentId: params.id,
      reason: parsed.data.reason,
      idempotencyKey: `admin-refund-${params.id}`,
    });
    return NextResponse.json(refund);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Refund failed" }, { status: 400 });
  }
}
