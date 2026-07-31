"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  destroyUserSession,
  getCurrentUser,
} from "@/lib/auth/session";
import {
  normalizeEmail,
  normalizeLoginIdentifier,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/validation";

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

function safeRedirectPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/profile";
  }
  return next;
}

export async function register(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthActionResult> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);

  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return { success: false, error: emailCheck.error };

  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) return { success: false, error: usernameCheck.error };

  const passwordCheck = validatePassword(input.password);
  if (!passwordCheck.ok) return { success: false, error: passwordCheck.error };

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { email: true, username: true },
  });

  if (existing?.email === email) {
    return { success: false, error: "An account with this email already exists" };
  }
  if (existing?.username === username) {
    return { success: false, error: "This username is already taken" };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
  });

  await createUserSession(user.id);
  return { success: true };
}

export async function login(input: {
  identifier: string;
  password: string;
  next?: string;
}): Promise<AuthActionResult> {
  const identifier = normalizeLoginIdentifier(input.identifier);
  if (!identifier) {
    return { success: false, error: "Email or username is required" };
  }

  if (!input.password) {
    return { success: false, error: "Password is required" };
  }

  const isEmail = identifier.includes("@");
  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return { success: false, error: "Invalid email/username or password" };
  }

  await createUserSession(user.id);
  return { success: true };
}

export async function logout(): Promise<void> {
  await destroyUserSession();
  redirect("/");
}

export async function getAuthUserSummary() {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
  };
}

export async function registerAndRedirect(input: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthActionResult> {
  const result = await register(input);
  if (result.success) {
    redirect("/profile");
  }
  return result;
}

export async function loginAndRedirect(input: {
  identifier: string;
  password: string;
  next?: string;
}): Promise<AuthActionResult> {
  const result = await login(input);
  if (result.success) {
    redirect(safeRedirectPath(input.next));
  }
  return result;
}
