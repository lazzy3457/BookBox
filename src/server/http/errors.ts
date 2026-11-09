import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Doublon (double clic, course entre deux requêtes), cible disparue, référence inconnue.
const prismaErrors: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: 409, code: "CONFLICT", message: "Cette action a déjà été prise en compte." },
  P2025: { status: 404, code: "NOT_FOUND", message: "Élément introuvable." },
  P2003: { status: 404, code: "NOT_FOUND", message: "Élément introuvable." }
};

type ErrorWithStatus = Error & { status?: number; code?: string; retryAfter?: number };

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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const known = prismaErrors[error.code];
    if (known) return NextResponse.json({ error: { code: known.code, message: known.message } }, { status: known.status });
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
    {
      status,
      headers: typed.retryAfter ? { "Retry-After": String(typed.retryAfter) } : undefined
    }
  );
}

export function conflict(message: string, code = "CONFLICT") {
  return Object.assign(new Error(message), { status: 409, code });
}

export function notFound(message: string, code = "NOT_FOUND") {
  return Object.assign(new Error(message), { status: 404, code });
}

export function badRequest(message: string, code = "BAD_REQUEST") {
  return Object.assign(new Error(message), { status: 400, code });
}
