import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileCredentials } from "@/server/auth/mobile";
import { apiError } from "@/server/http/errors";

const mobileLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = mobileLoginSchema.parse(await request.json());
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
