import { createHmac } from "crypto";
import { prisma } from "@/server/db/prisma";

type RateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

function secret() {
  const value = process.env.RATE_LIMIT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("RATE_LIMIT_SECRET est obligatoire en production."), {
      status: 500,
      code: "RATE_LIMIT_SECRET_REQUIRED"
    });
  }
  return value ?? "booksbox-rate-limit-development-secret";
}

function bucketKey(scope: string, identifier: string) {
  return createHmac("sha256", secret())
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export function getClientIdentifier(request: Request) {
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS === "true" || process.env.NODE_ENV !== "production";
  if (!trustProxyHeaders) {
    return `untrusted-proxy:${(request.headers.get("user-agent") ?? "no-agent").slice(0, 180)}`;
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? forwarded;
  if (address) return address.slice(0, 128);
  return `unknown:${(request.headers.get("user-agent") ?? "no-agent").slice(0, 180)}`;
}

export async function enforceRateLimit({ scope, identifier, limit, windowMs }: RateLimitInput) {
  const key = bucketKey(scope, identifier);
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);
  const [result] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextReset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  if (result && result.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
    throw Object.assign(new Error("Trop de tentatives. Réessaie dans quelques instants."), {
      status: 429,
      code: "RATE_LIMITED",
      retryAfter
    });
  }
}
