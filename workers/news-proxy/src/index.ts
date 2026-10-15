/**
 * Allowlisted NEWS RSS proxy for 0xterm (#213).
 * GET /?url=<allowlisted https RSS> → upstream XML (CORS + short cache).
 */
import { isAllowedNewsProxyUrl } from "./allowlist";

export interface Env {
  ALLOWED_ORIGINS?: string;
}

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const raw = (env.ALLOWED_ORIGINS || "").trim();
  let acao = "*";
  if (raw) {
    const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (origin && allowed.includes(origin)) acao = origin;
    else if (allowed.length === 1) acao = allowed[0];
    else acao = allowed.includes("https://app.0xterm.xyz")
      ? "https://app.0xterm.xyz"
      : allowed[0];
  }
  return {
    "Access-Control-Allow-Origin": acao,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function jsonError(
  status: number,
  message: string,
  request: Request,
  env: Env
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request, env)
    }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env)
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/health/") {
      return new Response("ok", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...corsHeaders(request, env)
        }
      });
    }

    if (request.method !== "GET") {
      return jsonError(405, "method not allowed", request, env);
    }

    const target = url.searchParams.get("url") || "";
    if (!target) {
      return jsonError(400, "missing url", request, env);
    }
    if (!isAllowedNewsProxyUrl(target)) {
      return jsonError(403, "url not on NEWS allowlist", request, env);
    }

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: "GET",
        redirect: "follow",
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "User-Agent": "0xterm-news-proxy/1.0 (+https://app.0xterm.xyz)"
        }
      });
    } catch {
      return jsonError(502, "upstream fetch failed", request, env);
    }

    if (!upstream.ok) {
      return jsonError(502, `upstream HTTP ${upstream.status}`, request, env);
    }

    const body = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("Content-Type") ||
      "application/rss+xml; charset=utf-8";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        ...corsHeaders(request, env)
      }
    });
  }
} satisfies ExportedHandler<Env>;
