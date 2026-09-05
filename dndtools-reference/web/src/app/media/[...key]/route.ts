import { getPcImageObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { key: parts } = await context.params;
  const key = parts.join("/");
  const object = await getPcImageObject(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const etag = request.headers.get("if-none-match");
  const tag = `"${key}"`;
  if (etag === tag) {
    return new Response(null, { status: 304 });
  }

  return new Response(Buffer.from(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: tag,
    },
  });
}
