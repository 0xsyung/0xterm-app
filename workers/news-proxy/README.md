# 0xterm NEWS allowlist proxy (#213)

Cloudflare Worker that fetches **only** the frozen NEWS RSS allowlist and returns XML to the browser. Not an open proxy.

## Endpoints

- `GET /?url=<https allowlisted RSS URL>` → upstream RSS/Atom XML
- `GET /health` → `ok`
- `OPTIONS /` → CORS preflight

Non-allowlisted `url` → `403`. Missing/invalid → `400`.

## Deploy

```bash
cd workers/news-proxy
npm i
npx wrangler login   # once
npx wrangler deploy
```

Bake the worker origin into the static app (no trailing slash):

```bash
# .github/workflows/deploy.yml build env, or local:
export NEXT_PUBLIC_NEWS_PROXY_URL=https://0xterm-news-proxy.<account>.workers.dev
```

Same-origin `/news/<id>.xml` mirrors (written at Pages build by `scripts/fetch-news-feeds.mjs`) remain the default primary when the env var is unset.

## SSRF gate

Exact https match against the four publisher feeds in `src/allowlist.ts` (keep in sync with `src/components/terminal/newsAllowlist.ts`).
