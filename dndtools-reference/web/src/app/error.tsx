"use client";

import Link from "next/link";
import {
  ErrorPageLayout,
  SERVER_ERROR_ILLUSTRATION,
} from "@/components/error-page-layout";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
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
  );
}
