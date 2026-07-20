import { Role } from "@prisma/client";

export function isAdminRole(role: string): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function isSuperAdminUser(user: { role: Role; isSuperAdmin?: boolean }): boolean {
  return user.role === Role.SUPER_ADMIN || user.isSuperAdmin === true;
}
