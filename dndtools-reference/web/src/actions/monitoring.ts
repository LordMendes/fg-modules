"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { reportError } from "@/lib/monitoring/report";

export async function throwServerTestError(): Promise<void> {
  await requireAdmin();
  throw new Error("Admin test: server action error");
}

export async function reportServerTestError(): Promise<string> {
  await requireAdmin();
  reportError(new Error("Admin test: reported error"), {
    source: "admin-test",
    level: "warning",
  });
  return "Reported to error tracking (admin-test, warning).";
}
