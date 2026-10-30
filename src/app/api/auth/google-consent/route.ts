import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { googleSignupConsentCookie } from "@/server/auth/google";
import { googleSignupConsentSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  try {
    googleSignupConsentSchema.parse(await request.json());
    const response = NextResponse.json({ ok: true });
    response.cookies.set(googleSignupConsentCookie());
    return response;
  } catch (error) {
    return apiError(error);
  }
}
