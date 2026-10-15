import { reportError } from "@/lib/monitoring/report";
import {
  MEDIA_CACHE_CONTROL,
  isNotModified,
  mediaEtag,
} from "@/lib/storage/media-response";
import { getPcImageObject, isMediaObjectKey } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { key: parts } = await context.params;
  const key = parts.join("/");
  if (!isMediaObjectKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  // Revalidation is answered from the request alone, so a cached image never
  // costs an R2 round trip.
  const etag = mediaEtag(key);
  if (isNotModified(request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": MEDIA_CACHE_CONTROL },
    });
  }

  let object;
  try {
    object = await getPcImageObject(key);
  } catch (error) {
    reportError(error, { source: "media", level: "error" });
    return new Response("Temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "5" },
    });
  }
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": object.contentType,
    "Cache-Control": MEDIA_CACHE_CONTROL,
    ETag: etag,
  });
  if (object.contentLength !== undefined) {
    headers.set("Content-Length", String(object.contentLength));
  }
  return new Response(object.body, { status: 200, headers });
}
