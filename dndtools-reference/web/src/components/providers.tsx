"use client";

import { ThemeProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  // React 19 / Next 16: next-themes injects a blocking <script> for zero-flash
  // theme. On the client, use a non-executable type so React does not warn.
  // SSR still emits a normal script in the initial HTML.
  const scriptProps: ThemeProviderProps["scriptProps"] =
    typeof window === "undefined"
      ? undefined
      : { type: "application/json", suppressHydrationWarning: true };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      scriptProps={scriptProps}
    >
      {children}
    </ThemeProvider>
  );
}
