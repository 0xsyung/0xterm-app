/**
 * @file IpfsCatWidget.tsx
 * @description Fetch + preview CID (text/image only) (#13 Soft chrome)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useEffect, useState } from "react";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import {
  IPFS_CAT_NO_PREVIEW_BYTES,
  IPFS_INLINE_IMAGE_MIMES
} from "../ipfs/constants";
import { fallbackGatewayUrl } from "../ipfs/gateway";
import { ipfsErrorLine } from "../ipfs/errors";
import { sanitizeCatText } from "../ipfs/sanitize";
import { formatSize } from "../ipfs/size";
import type { IpfsPrefs } from "../ipfs/types";

type CatState =
  | { step: "loading" }
  | {
      step: "text";
      text: string;
      truncated: boolean;
      totalBytes: number;
      mime: string;
    }
  | { step: "image"; url: string; mime: string }
  | { step: "link"; reason: string; url: string }
  | { step: "error"; message: string };

export default function IpfsCatWidget({
  theme,
  cid,
  gatewayUrl: primaryUrl,
  prefs: _prefs,
  onPin,
  pinned
}: {
  theme: ThemeConfig;
  cid: string;
  gatewayUrl: string;
  prefs?: IpfsPrefs;
  onPin?: () => void;
  pinned?: boolean;
}) {
  const [state, setState] = useState<CatState>({ step: "loading" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const urls = [primaryUrl, fallbackGatewayUrl(cid)];
      let lastErr = "";
      for (const url of urls) {
        try {
          const res = await fetch(url, { redirect: "follow" });
          if (!res.ok) {
            lastErr = `HTTP ${res.status}`;
            continue;
          }
          const mime = (
            res.headers.get("content-type") || ""
          )
            .split(";")[0]
            .trim()
            .toLowerCase();
          const lenHeader = res.headers.get("content-length");
          const len = lenHeader ? Number(lenHeader) : NaN;

          if (
            Number.isFinite(len) &&
            len > IPFS_CAT_NO_PREVIEW_BYTES
          ) {
            if (!cancelled) {
              setState({
                step: "link",
                reason: "too large to preview",
                url
              });
            }
            return;
          }

          if (IPFS_INLINE_IMAGE_MIMES.has(mime)) {
            if (!cancelled) {
              setState({ step: "image", url, mime });
            }
            return;
          }

          // text-ish + everything else we try as text (HTML/SVG → sanitized)
          const buf = await res.arrayBuffer();
          if (buf.byteLength > IPFS_CAT_NO_PREVIEW_BYTES) {
            if (!cancelled) {
              setState({
                step: "link",
                reason: "too large to preview",
                url
              });
            }
            return;
          }
          const raw = new TextDecoder().decode(buf);
          const { text, truncated, totalBytes } = sanitizeCatText(raw);
          if (!cancelled) {
            setState({
              step: "text",
              text,
              truncated,
              totalBytes,
              mime: mime || "text/plain"
            });
          }
          return;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      if (!cancelled) {
        setState({
          step: "error",
          message: `${ipfsErrorLine("IPFS_PREVIEW_FAIL")} CID is still: ${cid}${
            lastErr ? ` (${lastErr.split("\n")[0].slice(0, 80)})` : ""
          }`
        });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [cid, primaryUrl]);

  const openTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`relative group text-xs space-y-2 my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow || ""} w-full ${theme.text}`}
    >
      <div
        className={`flex justify-between items-center border-b ${theme.border} pb-1`}
      >
        <span className={`font-bold ${theme.primary} tracking-wider`}>
          IPFS CAT
        </span>
        <div className="flex items-center gap-2">
          {!pinned && onPin && <PinButton onPin={onPin} theme={theme} />}
        </div>
      </div>

      <div className={`break-all ${theme.muted}`}>
        <span className={`font-bold ${theme.primary}`}>{cid}</span>
        <span className="mx-2">·</span>
        <button
          type="button"
          onClick={() => openTab(primaryUrl)}
          className={`underline ${theme.muted}`}
        >
          {primaryUrl}
        </button>
      </div>

      {state.step === "loading" && (
        <div className={theme.muted}>fetching…</div>
      )}

      {state.step === "text" && (
        <div className="space-y-1">
          <div className={`text-[10px] ${theme.muted}`}>
            {state.mime}
            {" · "}
            <span className="tabular-nums">{formatSize(state.totalBytes)}</span>
            {state.truncated ? " · truncated" : ""}
          </div>
          <pre
            className={`p-2 bg-black/40 border ${theme.border} overflow-x-auto max-h-64 whitespace-pre-wrap break-words`}
          >
            {state.text}
          </pre>
        </div>
      )}

      {state.step === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.url}
          alt={cid}
          referrerPolicy="no-referrer"
          className="max-h-64 max-w-full object-contain"
          onError={() =>
            setState({
              step: "link",
              reason: "image failed — open in new tab",
              url: state.url
            })
          }
        />
      )}

      {state.step === "link" && (
        <div className="space-y-1">
          <div className={theme.muted}>{state.reason}</div>
          <button
            type="button"
            onClick={() => openTab(state.url)}
            className={`px-3 py-1.5 border ${theme.border} ${theme.primary} font-bold tracking-wider`}
          >
            OPEN IN TAB
          </button>
        </div>
      )}

      {state.step === "error" && (
        <div className={theme.warn}>{state.message}</div>
      )}
    </div>
  );
}
