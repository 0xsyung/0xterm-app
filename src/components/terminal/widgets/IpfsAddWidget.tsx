/**
 * @file IpfsAddWidget.tsx
 * @description File-picker → Pinata pinFileToIPFS (#13 Soft chrome)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import React, { useRef, useState } from "react";
import type { ThemeConfig } from "../types";
import PinButton from "./PinButton";
import { IPFS_MAX_BYTES, IPFS_PUBLIC_WARN } from "../ipfs/constants";
import { gatewayUrl } from "../ipfs/gateway";
import { ipfsErrorLine, sanitizeIpfsErr } from "../ipfs/errors";
import { pinFileToIpfs } from "../ipfs/pinata";
import { formatSize, isTooBig } from "../ipfs/size";
import {
  isWalletDumpFilename,
  looksLikeWalletJson
} from "../ipfs/walletDump";
import type { IpfsAddResult, IpfsPinRow, IpfsPrefs } from "../ipfs/types";

type Phase =
  | { step: "pick" }
  | {
      step: "confirm";
      file: File;
      name: string;
      mime: string;
      size: number;
    }
  | { step: "uploading"; name: string; size: number }
  | { step: "done"; result: IpfsAddResult; dropped?: boolean }
  | { step: "error"; message: string };

export default function IpfsAddWidget({
  theme,
  jwt,
  prefs,
  displayName,
  publicWarn = IPFS_PUBLIC_WARN,
  onPinned,
  onPin,
  pinned
}: {
  theme: ThemeConfig;
  jwt: string;
  prefs: IpfsPrefs;
  displayName?: string;
  publicWarn?: string;
  /** Persist local pin row after successful upload. */
  onPinned?: (row: IpfsPinRow) => { dropped: boolean };
  onPin?: () => void;
  pinned?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ step: "pick" });

  const openPicker = () => {
    inputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so the same file can be re-picked after cancel
    e.target.value = "";
    if (!file) {
      setPhase({
        step: "error",
        message: ipfsErrorLine("IPFS_NO_FILE")
      });
      return;
    }
    if (isWalletDumpFilename(file.name)) {
      setPhase({
        step: "error",
        message: ipfsErrorLine("IPFS_WALLET_DUMP")
      });
      return;
    }
    if (isTooBig(file.size, IPFS_MAX_BYTES)) {
      setPhase({
        step: "error",
        message: ipfsErrorLine("IPFS_TOO_BIG")
      });
      return;
    }
    // Peek JSON for wallet/mnemonic dumps
    if (
      file.type === "application/json" ||
      /\.json$/i.test(file.name)
    ) {
      try {
        const head = await file.slice(0, 64 * 1024).text();
        if (looksLikeWalletJson(head)) {
          setPhase({
            step: "error",
            message: ipfsErrorLine("IPFS_WALLET_DUMP")
          });
          return;
        }
      } catch {
        // ignore peek errors — still allow confirm
      }
    }
    setPhase({
      step: "confirm",
      file,
      name: displayName || file.name,
      mime: file.type || "(unknown)",
      size: file.size
    });
  };

  const doUpload = async (file: File, name: string) => {
    setPhase({ step: "uploading", name, size: file.size });
    try {
      const res = await pinFileToIpfs(file, jwt);
      const cid = res.IpfsHash;
      const url = gatewayUrl(cid, prefs);
      const result: IpfsAddResult = {
        cid,
        gatewayUrl: url,
        name,
        size: file.size,
        mime: file.type || undefined
      };
      const row: IpfsPinRow = {
        cid,
        name,
        size: file.size,
        mime: file.type || undefined,
        gatewayUrl: url,
        ts: Date.now(),
        source: "add"
      };
      const dropped = onPinned?.(row)?.dropped ?? false;
      setPhase({ step: "done", result, dropped });
    } catch (err) {
      setPhase({ step: "error", message: sanitizeIpfsErr(err) });
    }
  };

  return (
    <div
      className={`relative group text-xs space-y-2 my-3 p-4 border ${theme.border} ${theme.cardBg} ${theme.rounded} ${theme.glow || ""} w-full ${theme.text}`}
    >
      <div
        className={`flex justify-between items-center border-b ${theme.border} pb-1`}
      >
        <span className={`font-bold ${theme.primary} tracking-wider`}>
          IPFS ADD
        </span>
        <div className="flex items-center gap-2">
          {!pinned && onPin && <PinButton onPin={onPin} theme={theme} />}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onFileChange}
      />

      {phase.step === "pick" && (
        <div className="space-y-2">
          <div className={theme.muted}>
            Pick a file to pin (max 10 MiB). No silent disk read.
          </div>
          <button
            type="button"
            onClick={openPicker}
            className={`px-3 py-1.5 border ${theme.border} ${theme.primary} font-bold tracking-wider hover:bg-current/10`}
          >
            CHOOSE FILE
          </button>
        </div>
      )}

      {phase.step === "confirm" && (
        <div className="space-y-2">
          <div>
            <span className={theme.muted}>name </span>
            <span className="font-bold">{phase.name}</span>
          </div>
          <div>
            <span className={theme.muted}>MIME </span>
            <span>{phase.mime}</span>
          </div>
          <div>
            <span className={theme.muted}>size </span>
            <span className="tabular-nums">{formatSize(phase.size)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => doUpload(phase.file, phase.name)}
              className={`px-3 py-1.5 border ${theme.border} ${theme.primary} font-bold tracking-wider hover:bg-current/10`}
            >
              PIN TO IPFS
            </button>
            <button
              type="button"
              onClick={() => setPhase({ step: "pick" })}
              className={`px-3 py-1.5 border ${theme.border} ${theme.muted} tracking-wider hover:bg-current/10`}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {phase.step === "uploading" && (
        <div className={theme.muted}>
          uploading…{" "}
          <span className="tabular-nums">{formatSize(phase.size)}</span>
        </div>
      )}

      {phase.step === "done" && (
        <div className="space-y-2">
          <div className="break-all">
            <span className={`font-bold ${theme.primary}`}>
              {phase.result.cid}
            </span>
            <span className="mx-2"> </span>
            <a
              href={phase.result.gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline ${theme.muted} break-all`}
            >
              {phase.result.gatewayUrl}
            </a>
          </div>
          <div className={`p-2 border ${theme.border} ${theme.warn} ${theme.rounded}`}>
            {publicWarn}
          </div>
          {phase.dropped && (
            <div className={theme.muted}>
              oldest pin dropped — local list capped at 50
            </div>
          )}
        </div>
      )}

      {phase.step === "error" && (
        <div className="space-y-2">
          <div className={theme.warn}>{phase.message}</div>
          <button
            type="button"
            onClick={() => setPhase({ step: "pick" })}
            className={`px-3 py-1.5 border ${theme.border} ${theme.muted} tracking-wider hover:bg-current/10`}
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
