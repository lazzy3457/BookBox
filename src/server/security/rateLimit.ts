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

// En-têtes d'une requête web (Headers) ou de NextAuth (objet simple).
export type HeaderSource = Headers | Record<string, unknown>;

function readHeader(headers: HeaderSource, name: string) {
  const value = headers instanceof Headers ? headers.get(name) : headers[name];
  return typeof value === "string" && value ? value : null;
}

// TRUST_PROXY_HEADERS : "true" derrière un proxy qui réécrit x-forwarded-for / x-real-ip,
// "cloudflare" pour lire cf-connecting-ip (falsifiable par le client hors Cloudflare).
// Sans proxy de confiance en production, aucune adresse fiable n'existe : les limites par
// adresse se rabattent sur le User-Agent, partagé entre visiteurs et facile à changer.
export function getClientIdentifierFromHeaders(headers: HeaderSource) {
  const mode = process.env.TRUST_PROXY_HEADERS;
  const userAgent = (readHeader(headers, "user-agent") ?? "no-agent").slice(0, 180);
  if (mode !== "true" && mode !== "cloudflare" && process.env.NODE_ENV === "production") {
    return `untrusted-proxy:${userAgent}`;
  }
  const forwarded = readHeader(headers, "x-forwarded-for")?.split(",")[0]?.trim();
  const address = (mode === "cloudflare" ? readHeader(headers, "cf-connecting-ip") : null)
    ?? readHeader(headers, "x-real-ip")
    ?? forwarded;
  if (address) return address.slice(0, 128);
  return `unknown:${userAgent}`;
}

export function getClientIdentifier(request: Request) {
  return getClientIdentifierFromHeaders(request.headers);
}

export async function purgeExpiredRateLimitBuckets() {
  return prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
}

// Connexion web et mobile : plafond par adresse e-mail visée et par adresse cliente.
export async function enforceLoginRateLimit(email: string, headers?: HeaderSource) {
  await enforceRateLimit({ scope: "login-email", identifier: email, limit: 10, windowMs: 15 * 60_000 });
  if (headers) {
    await enforceRateLimit({ scope: "login-ip", identifier: getClientIdentifierFromHeaders(headers), limit: 30, windowMs: 15 * 60_000 });
  }
}

export async function enforceRateLimit({ scope, identifier, limit, windowMs }: RateLimitInput) {
  // Ménage occasionnel : sans lui, les compteurs expirés s'accumulent indéfiniment.
  if (Math.random() < 0.01) void purgeExpiredRateLimitBuckets().catch(() => undefined);
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
