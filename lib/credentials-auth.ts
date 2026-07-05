import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  username: string;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

export async function findUserByLogin(login: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
      isActive: true,
    },
  });
}

export async function verifyUserCredentials(
  login: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await findUserByLogin(login);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    username: user.username,
    avatarUrl: user.avatarUrl,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorSecret: user.twoFactorSecret,
  };
}

export function toSessionUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}
