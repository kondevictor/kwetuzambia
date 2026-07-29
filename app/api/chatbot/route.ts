import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatReply } from "@/lib/chatbot";

const bodySchema = z.object({ message: z.string().max(500) });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const reply = getChatReply(parsed.data.message);
  return NextResponse.json(reply);
}
