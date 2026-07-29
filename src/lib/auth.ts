import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { WELCOME_BONUS_POINTS } from "./loyalty";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      },
    }),
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) return null;
        const otp = await prisma.phoneOtp.findFirst({
          where: { phone: credentials.phone, code: credentials.code, consumed: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!otp) return null;
        await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumed: true } });

        let user = await prisma.user.findUnique({ where: { phone: credentials.phone } });
        if (!user) {
          const passwordHash = await bcrypt.hash(randomUUID(), 10); // unused for phone-otp accounts
          user = await prisma.user.create({
            data: {
              name: credentials.name?.trim() || `Kwetu User ${credentials.phone.slice(-4)}`,
              email: `phone-${credentials.phone.replace(/\D/g, "")}@kwetu.local`,
              phone: credentials.phone,
              passwordHash,
              role: "CONSUMER",
              verified: true,
              wallet: { create: { loyaltyPoints: WELCOME_BONUS_POINTS } },
            },
          });
        } else {
          await prisma.wallet.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
