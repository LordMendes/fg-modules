import type { ReactNode } from "react";

export type ErrorPageIllustration = {
  src: string;
  alt: string;
  creditLabel?: string;
  creditHref?: string;
  /** contain shows the full illustration; cover crops to fill (photos). */
  fit?: "contain" | "cover";
};

type ErrorPageLayoutProps = {
  code: string;
  title: string;
  description: string;
  illustration: ErrorPageIllustration;
  children?: ReactNode;
  referenceCode?: string;
};

export function ErrorPageLayout({
  code,
  title,
  description,
  illustration,
  children,
  referenceCode,
}: ErrorPageLayoutProps) {
  return (
    <div className="error-page">
      <div className="error-page-hero">
        <img
          className={`error-page-image${illustration.fit === "cover" ? " error-page-image-cover" : ""}`}
          src={illustration.src}
          alt={illustration.alt}
          width={1600}
          height={900}
          loading="eager"
          decoding="async"
        />
        {illustration.creditLabel && illustration.creditHref ? (
          <p className="error-page-credit">
            Photo by{" "}
            <a href={illustration.creditHref} rel="noopener noreferrer">
              {illustration.creditLabel}
            </a>{" "}
            on{" "}
            <a href="https://unsplash.com/license" rel="noopener noreferrer">
              Unsplash
            </a>
          </p>
        ) : null}
      </div>
      <div className="error-page-body page-header">
        <p className="error-page-code" aria-hidden="true">
          {code}
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
        {referenceCode ? (
          <p className="error-page-reference">
            Reference: <code>{referenceCode}</code>
          </p>
        ) : null}
        {children ? <div className="error-page-actions">{children}</div> : null}
      </div>
    </div>
  );
}

export const NOT_FOUND_ILLUSTRATION: ErrorPageIllustration = {
  src: "/errors/not-found.jpg",
  alt: "A wizard comforting a sad dragon in a cluttered magical study",
  fit: "contain",
};

export const SERVER_ERROR_ILLUSTRATION: ErrorPageIllustration = {
  src: "/errors/server-error.jpg",
  alt: "Lightning strike over a dark stormy landscape",
  creditLabel: "Fabien Berne",
  creditHref: "https://unsplash.com/photos/Rtd3eENsZts",
  fit: "cover",
};
