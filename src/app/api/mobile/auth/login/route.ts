import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileCredentials } from "@/server/auth/mobile";
import { apiError } from "@/server/http/errors";
import { enforceLoginRateLimit } from "@/server/security/rateLimit";

const mobileLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(120)
});

export async function POST(request: Request) {
  try {
    const input = mobileLoginSchema.parse(await request.json());
    await enforceLoginRateLimit(input.email, request.headers);
    const result = await authenticateMobileCredentials(input);

    if (!result) {
      throw Object.assign(new Error("Email ou mot de passe incorrect."), {
        status: 401,
        code: "INVALID_CREDENTIALS"
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
