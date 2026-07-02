import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";
import { enforceRateLimit } from "@/server/security/rateLimit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await enforceRateLimit({
          scope: "login-email",
          identifier: email,
          limit: 10,
          windowMs: 15 * 60_000
        });

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash || !user.emailVerified || user.suspendedAt) {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          sessionVersion: user.sessionVersion
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sessionVersion = user.sessionVersion ?? 0;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            email: true,
            image: true,
            name: true
            ,
            role: true,
            sessionVersion: true
          }
        });

        const hasVersionInformation =
          typeof user?.sessionVersion === "number" && typeof token.sessionVersion === "number";
        const isCurrentSession =
          !hasVersionInformation || user.sessionVersion === token.sessionVersion;

        if (user && isCurrentSession) {
          session.user.email = user.email;
          session.user.image = user.image;
          session.user.name = user.name;
          session.user.role = user.role;
        } else {
          session.user = undefined;
        }
      }

      return session;
    }
  }
};
