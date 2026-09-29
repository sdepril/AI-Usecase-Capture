// Proxy to the Artificial Analysis MCP deployment (sdepril/artificial-analysis-mcp).
// Keeps the AA MCP token server-side; caches 6h so the free-tier budget is untouched by this app.
// Env: AA_MCP_URL (e.g. https://artificial-analysis-mcp.vercel.app), AA_MCP_TOKEN, CAPTURE_TOKEN (this app's own access token).
import { timingSafeEqual } from "node:crypto";

const TTL_MS = 6 * 60 * 60 * 1000;
let cache = null; // { at, body }

function authorized(req) {
  const expected = process.env.CAPTURE_TOKEN;
  if (!expected) return false;
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const given = url.searchParams.get("token") || (auth.startsWith("Bearer ") ? auth.slice(7) : "");
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req) {
  const headers = { "content-type": "application/json", "cache-control": "private, no-store" };
  if (!authorized(req)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  if (cache && Date.now() - cache.at < TTL_MS) return new Response(cache.body, { headers });
  const base = process.env.AA_MCP_URL, token = process.env.AA_MCP_TOKEN;
  if (!base || !token) return new Response(JSON.stringify({ error: "AA_MCP_URL / AA_MCP_TOKEN not set" }), { status: 500, headers });
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/api/models?token=${encodeURIComponent(token)}`);
    const body = await r.text();
    if (!r.ok) {
      if (cache) return new Response(cache.body, { headers }); // serve stale on upstream failure
      return new Response(JSON.stringify({ error: `upstream ${r.status}`, detail: body.slice(0, 300) }), { status: 502, headers });
    }
    cache = { at: Date.now(), body };
    return new Response(body, { headers });
  } catch (e) {
    if (cache) return new Response(cache.body, { headers });
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers });
  }
}
