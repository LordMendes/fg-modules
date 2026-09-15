export const AUTH_COOKIE_NAME = "dnd_auth";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string | null;
};
