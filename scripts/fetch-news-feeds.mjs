#!/usr/bin/env node
/**
 * Fetch frozen NEWS allowlist RSS into public/news/<id>.xml for same-origin
 * static serving on GitHub Pages (#213). SSRF-safe: only the hardcoded URLs.
 *
 * Usage: node scripts/fetch-news-feeds.mjs
 * Exit 0 even when some feeds fail (partial mirror); exit 1 if all fail.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "news");

/** Keep in sync with src/components/terminal/newsAllowlist.ts */
const FEEDS = [
  { id: "cointelegraph", rssUrl: "https://cointelegraph.com/rss" },
  { id: "decrypt", rssUrl: "https://decrypt.co/feed" },
  { id: "coindesk", rssUrl: "https://www.coindesk.com/arc/outboundfeeds/rss" },
  { id: "defiant", rssUrl: "https://thedefiant.io/api/feed" }
];

const ALLOWED = new Set(FEEDS.map((f) => f.rssUrl));

function isAllowed(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const normalized = u.href.replace(/\/$/, "");
    for (const a of ALLOWED) {
      if (a === url || a.replace(/\/$/, "") === normalized) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchOne({ id, rssUrl }) {
  if (!isAllowed(rssUrl)) {
    throw new Error(`refusing non-allowlist URL for ${id}`);
  }
  const res = await fetch(rssUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "0xterm-news-cache/1.0 (+https://app.0xterm.xyz)"
    },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 32) throw new Error("empty body");
  // Basic sanity: looks like XML/RSS/Atom
  if (!/<rss[\s>]/i.test(text) && !/<feed[\s>]/i.test(text)) {
    throw new Error("body is not RSS/Atom XML");
  }
  const dest = join(outDir, `${id}.xml`);
  await writeFile(dest, text, "utf8");
  return dest;
}

await mkdir(outDir, { recursive: true });

// Refuse to write arbitrary paths — only FEEDS ids.
const results = await Promise.allSettled(FEEDS.map((f) => fetchOne(f)));
let ok = 0;
results.forEach((r, i) => {
  const id = FEEDS[i].id;
  if (r.status === "fulfilled") {
    ok++;
    console.log(`ok  ${id} → ${r.value}`);
  } else {
    console.error(`fail ${id}: ${r.reason?.message || r.reason}`);
  }
});

const manifest = {
  fetchedAt: new Date().toISOString(),
  ok,
  total: FEEDS.length,
  feeds: FEEDS.map((f, i) => ({
    id: f.id,
    rssUrl: f.rssUrl,
    ok: results[i].status === "fulfilled"
  }))
};
await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

if (ok === 0) {
  console.error("all NEWS feeds failed — refusing empty mirror");
  process.exit(1);
}
console.log(`NEWS mirror: ${ok}/${FEEDS.length}`);
