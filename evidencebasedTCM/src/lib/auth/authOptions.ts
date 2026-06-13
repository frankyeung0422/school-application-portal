import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { verifyTotp, consumeRecoveryCode } from "./totp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "TOTP code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // If 2FA is enabled, require a valid TOTP code OR an unused recovery code.
        if (user.totpEnabled && user.totpSecret) {
          const code = (credentials.totpCode as string | undefined)?.trim() ?? "";
          if (!code) {
            // Signal to the login UI to prompt for the code.
            throw new Error("totp_required");
          }
          // Try TOTP first.
          if (verifyTotp(user.totpSecret, code)) {
            // Good.
          } else {
            // Try as a recovery code.
            const remaining = await consumeRecoveryCode(user.totpRecoveryCodes, code);
            if (remaining === null) {
              throw new Error("totp_invalid");
            }
            // Burn the recovery code.
            await prisma.user.update({
              where: { id: user.id },
              data: { totpRecoveryCodes: remaining },
            });
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
