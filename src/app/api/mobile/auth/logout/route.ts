import { NextResponse } from "next/server";
import { revokeMobileToken } from "@/server/auth/mobile";
import { apiError } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    await revokeMobileToken(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
