import type { AuthUser } from "@/lib/auth/constants";
import { normalizeEmail } from "@/lib/auth/validation";

export const ADMIN_EMAIL = "lucasmendes.lx@gmail.com";

export function isAdminUser(
  user: Pick<AuthUser, "email"> | null | undefined,
): boolean {
  if (!user?.email) return false;
  return normalizeEmail(user.email) === ADMIN_EMAIL;
}
