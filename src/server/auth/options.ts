import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/server/db/prisma";
import { authorizeCredentials } from "@/server/auth/credentials";
import { checkGoogleSignIn, createGoogleUser, googleProvider, isGoogleAuthEnabled } from "@/server/auth/google";

export const authOptions: NextAuthOptions = {
  adapter: { ...PrismaAdapter(prisma), createUser: createGoogleUser },
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: (credentials) => authorizeCredentials(credentials)
    }),
    ...(isGoogleAuthEnabled() ? [googleProvider()] : [])
  ],
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" ? checkGoogleSignIn(account, profile) : true;
    },
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
