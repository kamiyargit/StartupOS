import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { toSessionUser, verifyUserCredentials } from "@/lib/credentials-auth";
import { verifyTwoFactorTicket } from "@/lib/two-factor-tokens";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        twoFactorTicket: { label: "2FA Ticket", type: "text" },
        setupLoginToken: { label: "Setup Login Token", type: "text" },
      },
      async authorize(credentials) {
        const setupLoginToken = credentials?.setupLoginToken as string | undefined;
        if (setupLoginToken) {
          const { verifySetupLoginToken } = await import("@/lib/installation/setup-login-token");
          const payload = verifySetupLoginToken(setupLoginToken);
          if (!payload) return null;
          const { prisma } = await import("@/lib/prisma");
          const user = await prisma.user.findUnique({ where: { id: payload.sub } });
          if (!user?.isActive) return null;
          return toSessionUser({
            id: user.id,
            name: user.fullName,
            email: user.email,
            role: user.role,
            username: user.username,
            avatarUrl: user.avatarUrl,
            twoFactorEnabled: user.twoFactorEnabled,
            twoFactorSecret: user.twoFactorSecret,
          });
        }

        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;
        const twoFactorTicket = credentials?.twoFactorTicket as string | undefined;
        if (!login || !password) return null;

        const user = await verifyUserCredentials(login, password);
        if (!user) return null;

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!twoFactorTicket) return null;
          const ticket = verifyTwoFactorTicket(twoFactorTicket);
          if (!ticket || ticket.sub !== user.id) return null;
        }

        return toSessionUser(user);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: string }).role;
        token.username = (user as { username: string }).username;
        token.avatarUrl = (user as { avatarUrl: string | null }).avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
});
