import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorWithStatus = Error & { status?: number; code?: string };

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Les données envoyées sont invalides."
        }
      },
      { status: 400 }
    );
  }

  const typed = error as ErrorWithStatus;
  const status = typed.status ?? 500;

  return NextResponse.json(
    {
      error: {
        code: typed.code ?? (status === 401 ? "UNAUTHORIZED" : "SERVER_ERROR"),
        message:
          status === 500
            ? "Une erreur inattendue est survenue."
            : typed.message
      }
    },
    { status }
  );
}

export function conflict(message: string, code = "CONFLICT") {
  return Object.assign(new Error(message), { status: 409, code });
}

export function notFound(message: string, code = "NOT_FOUND") {
  return Object.assign(new Error(message), { status: 404, code });
}
