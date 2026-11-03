/**
 * @file store.ts
 * @description V2 News IndexedDB accumulate store (#295 G)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const NEWS_IDB_NAME = "0xterm-v2-news";
export const NEWS_IDB_VERSION = 1;
export const NEWS_IDB_STORE = "articles";
export const NEWS_IDB_META = "meta";

export type NewsRetention = "90d" | "1y" | "all";

export type StoredNewsArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  sourceName: string;
  url: string;
  publishedAt: number;
  ingestedAt: number;
  /** Lowercased blob for local full-text search. */
  searchText: string;
};

export type NewsStoreMeta = {
  retention: NewsRetention;
  lastIngestAt: number | null;
};

const DEFAULT_META: NewsStoreMeta = {
  retention: "all",
  lastIngestAt: null
};

export function buildSearchText(a: {
  title: string;
  summary?: string;
  body?: string;
  sourceName: string;
}): string {
  return [a.title, a.summary || "", a.body || "", a.sourceName]
    .join(" ")
    .toLowerCase();
}

export function retentionCutoffMs(
  retention: NewsRetention,
  now = Date.now()
): number | null {
  if (retention === "all") return null;
  if (retention === "90d") return now - 90 * 24 * 60 * 60 * 1000;
  return now - 365 * 24 * 60 * 60 * 1000;
}

type IdbFactory = typeof indexedDB;

function openDb(idb: IdbFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof idb === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = idb.open(NEWS_IDB_NAME, NEWS_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NEWS_IDB_STORE)) {
        const store = db.createObjectStore(NEWS_IDB_STORE, { keyPath: "id" });
        store.createIndex("publishedAt", "publishedAt", { unique: false });
        store.createIndex("ingestedAt", "ingestedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(NEWS_IDB_META)) {
        db.createObjectStore(NEWS_IDB_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("idb abort"));
  });
}

export async function getNewsMeta(
  idb: IdbFactory = indexedDB
): Promise<NewsStoreMeta> {
  const db = await openDb(idb);
  try {
    const tx = db.transaction(NEWS_IDB_META, "readonly");
    const store = tx.objectStore(NEWS_IDB_META);
    const value = await new Promise<NewsStoreMeta | undefined>(
      (resolve, reject) => {
        const req = store.get("prefs");
        req.onsuccess = () => resolve(req.result as NewsStoreMeta | undefined);
        req.onerror = () => reject(req.error);
      }
    );
    await txDone(tx);
    return value ? { ...DEFAULT_META, ...value } : { ...DEFAULT_META };
  } finally {
    db.close();
  }
}

export async function setNewsRetention(
  retention: NewsRetention,
  idb: IdbFactory = indexedDB
): Promise<NewsStoreMeta> {
  const db = await openDb(idb);
  try {
    const tx = db.transaction(NEWS_IDB_META, "readwrite");
    const store = tx.objectStore(NEWS_IDB_META);
    const prev = await new Promise<NewsStoreMeta>((resolve, reject) => {
      const req = store.get("prefs");
      req.onsuccess = () =>
        resolve(
          (req.result as NewsStoreMeta | undefined)
            ? { ...DEFAULT_META, ...(req.result as NewsStoreMeta) }
            : { ...DEFAULT_META }
        );
      req.onerror = () => reject(req.error);
    });
    const next: NewsStoreMeta = { ...prev, retention };
    store.put(next, "prefs");
    await txDone(tx);
    return next;
  } finally {
    db.close();
  }
}

export async function upsertNewsArticles(
  articles: Omit<StoredNewsArticle, "searchText" | "ingestedAt">[],
  idb: IdbFactory = indexedDB,
  now = Date.now()
): Promise<number> {
  if (!articles.length) return 0;
  const db = await openDb(idb);
  let written = 0;
  try {
    const tx = db.transaction(
      [NEWS_IDB_STORE, NEWS_IDB_META],
      "readwrite"
    );
    const store = tx.objectStore(NEWS_IDB_STORE);
    const metaStore = tx.objectStore(NEWS_IDB_META);
    for (const raw of articles) {
      const record: StoredNewsArticle = {
        ...raw,
        ingestedAt: now,
        searchText: buildSearchText(raw)
      };
      store.put(record);
      written += 1;
    }
    const prev = await new Promise<NewsStoreMeta>((resolve, reject) => {
      const metaReq = metaStore.get("prefs");
      metaReq.onsuccess = () =>
        resolve(
          (metaReq.result as NewsStoreMeta | undefined)
            ? { ...DEFAULT_META, ...(metaReq.result as NewsStoreMeta) }
            : { ...DEFAULT_META }
        );
      metaReq.onerror = () => reject(metaReq.error);
    });
    metaStore.put({ ...prev, lastIngestAt: now }, "prefs");
    await txDone(tx);
    return written;
  } finally {
    db.close();
  }
}

export async function listNewsArticles(
  idb: IdbFactory = indexedDB,
  opts?: { retention?: NewsRetention; now?: number }
): Promise<StoredNewsArticle[]> {
  const meta = opts?.retention
    ? { retention: opts.retention }
    : await getNewsMeta(idb);
  const cutoff = retentionCutoffMs(
    opts?.retention || meta.retention,
    opts?.now ?? Date.now()
  );
  const db = await openDb(idb);
  try {
    const tx = db.transaction(NEWS_IDB_STORE, "readonly");
    const store = tx.objectStore(NEWS_IDB_STORE);
    const all = await new Promise<StoredNewsArticle[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredNewsArticle[]) || []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    const filtered =
      cutoff == null
        ? all
        : all.filter((a) => a.publishedAt >= cutoff || a.ingestedAt >= cutoff);
    return filtered.sort((a, b) => b.publishedAt - a.publishedAt);
  } finally {
    db.close();
  }
}

/** Local full-text search over accumulated articles (title/summary/body/source). */
export function searchNewsArticles(
  articles: StoredNewsArticle[],
  query: string
): StoredNewsArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  const tokens = q.split(/\s+/).filter(Boolean);
  return articles.filter((a) => tokens.every((t) => a.searchText.includes(t)));
}

export async function getNewsArticle(
  id: string,
  idb: IdbFactory = indexedDB
): Promise<StoredNewsArticle | null> {
  const db = await openDb(idb);
  try {
    const tx = db.transaction(NEWS_IDB_STORE, "readonly");
    const store = tx.objectStore(NEWS_IDB_STORE);
    const row = await new Promise<StoredNewsArticle | undefined>(
      (resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () =>
          resolve(req.result as StoredNewsArticle | undefined);
        req.onerror = () => reject(req.error);
      }
    );
    await txDone(tx);
    return row || null;
  } finally {
    db.close();
  }
}
