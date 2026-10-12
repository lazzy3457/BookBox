import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

type MobileTokenPayload = {
  sub: string;
  email: string | null;
  name: string | null;
  iat: number;
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getMobileJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("MOBILE_JWT_SECRET est obligatoire en production."), {
      status: 500,
      code: "MOBILE_JWT_SECRET_REQUIRED"
    });
  }

  return secret ?? "booksbox-mobile-development-secret";
}

function signTokenPayload(encodedHeader: string, encodedPayload: string) {
  return base64UrlEncode(
    createHmac("sha256", getMobileJwtSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest()
  );
}

export function createMobileToken(user: { id: string; email: string | null; name: string | null }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: MobileTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function getMobileBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

export function verifyMobileToken(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signTokenPayload(encodedHeader, encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as MobileTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getMobileUserId(request: Request) {
  const token = getMobileBearerToken(request);

  if (!token) {
    return null;
  }

  return verifyMobileToken(token)?.sub ?? null;
}

export async function authenticateMobileCredentials(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      passwordHash: true
      ,
      emailVerified: true,
      suspendedAt: true
    }
  });

  if (!user?.passwordHash || !user.emailVerified || user.suspendedAt) {
    return null;
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  const { passwordHash: _passwordHash, emailVerified: _emailVerified, suspendedAt: _suspendedAt, ...safeUser } = user;

  return {
    token: createMobileToken(user),
    user: safeUser
  };
}
