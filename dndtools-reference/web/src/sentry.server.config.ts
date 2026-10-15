import * as Sentry from "@sentry/nextjs";
import { getDsn, getEnvironment, getRelease } from "./lib/monitoring/config";
import { registerReporter } from "./lib/monitoring/report";
import { scrubEvent } from "./lib/monitoring/scrub";

const dsn = getDsn();

if (dsn) {
  Sentry.init({
    dsn,
    environment: getEnvironment(),
    release: getRelease(),
    beforeSend: scrubEvent,
  });

  registerReporter({
    capture(error, ctx) {
      const level = ctx.level ?? "error";
      Sentry.captureException(error, {
        level,
        tags: {
          source: ctx.source,
          ...ctx.tags,
        },
        extra: ctx.extra,
      });
    },
    flush(timeoutMs) {
      return Sentry.flush(timeoutMs);
    },
  });
}
