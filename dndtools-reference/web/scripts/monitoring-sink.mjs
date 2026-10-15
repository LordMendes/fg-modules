import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { gunzipSync } from "node:zlib";

const port = Number(process.env.SINK_PORT ?? 9999);
const host = "127.0.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function envelopePathOk(url) {
  return /^\/api\/\d+\/envelope\/?$/i.test(url.split("?")[0] ?? "");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function decompressBody(buf, encoding) {
  if (!encoding || encoding.toLowerCase() !== "gzip") {
    return buf;
  }
  return gunzipSync(buf);
}

function parseEnvelope(raw) {
  const text = raw.toString("utf8");
  const lines = text.split("\n");
  let i = 0;
  if (i >= lines.length) return;
  JSON.parse(lines[i]);
  i += 1;

  while (i < lines.length) {
    if (lines[i] === "") {
      i += 1;
      continue;
    }
    const itemHeader = JSON.parse(lines[i]);
    i += 1;
    const type = itemHeader.type ?? "unknown";
    let payloadStr;
    if (typeof itemHeader.length === "number") {
      payloadStr = lines.slice(i).join("\n").slice(0, itemHeader.length);
      i = lines.length;
    } else if (i < lines.length) {
      payloadStr = lines[i];
      i += 1;
    } else {
      console.log(`[sink] item type=${type}`);
      continue;
    }

    if (type === "event") {
      let payload;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        console.log(`[sink] item type=${type} (invalid json)`);
        continue;
      }
      const level = payload.level ?? "unknown";
      const message =
        payload.exception?.values?.[0]?.value ??
        payload.message ??
        "(no message)";
      const source = payload.tags?.source ?? "";
      const environment = payload.environment ?? "";
      const release = payload.release ?? "";
      console.log(
        `[sink] event level=${level} message=${message} source=${source} environment=${environment} release=${release}`,
      );
    } else {
      console.log(`[sink] item type=${type}`);
    }
  }
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST" || !envelopePathOk(url)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  try {
    const raw = await readBody(req);
    const body = decompressBody(raw, req.headers["content-encoding"]);
    parseEnvelope(body);
    const id = randomBytes(16).toString("hex");
    res.writeHead(200, {
      ...corsHeaders,
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ id }));
  } catch (err) {
    console.error("[sink] error", err);
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
  }
});

server.listen(port, host, () => {
  console.log(`[sink] listening on http://${host}:${port}`);
});
