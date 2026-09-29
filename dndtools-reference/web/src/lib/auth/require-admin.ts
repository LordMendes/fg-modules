import { isAdminUser } from "@/lib/auth/admin";
import type { AuthUser } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/session";

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user)) {
    throw new Error("Forbidden");
  }
  return user;
}
