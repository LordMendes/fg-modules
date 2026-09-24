"use client";

import Link from "next/link";
import {
  ErrorPageLayout,
  SERVER_ERROR_ILLUSTRATION,
} from "@/components/error-page-layout";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full min-w-0 flex flex-col antialiased">
        <ErrorPageLayout
          code="500"
          title="Something went wrong"
          description="An unexpected error occurred. You can try again or return home."
          illustration={SERVER_ERROR_ILLUSTRATION}
          referenceCode={error.digest}
        >
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Return home
          </Link>
        </ErrorPageLayout>
      </body>
    </html>
  );
}
