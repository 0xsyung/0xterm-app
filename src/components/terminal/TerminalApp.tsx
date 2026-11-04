/**
 * @file TerminalApp.tsx
 * @description App entry — V2 portfolio shell (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/config/wagmi";
import { isCoarsePointer } from "@/components/terminal/viewport";

function Splash() {
  return (
    <div className="w-full h-full bg-[#0b0d10] text-[#6ee7b7] font-plex tracking-tight flex flex-col items-center justify-center gap-4">
      <img
        src="/logo.svg"
        alt="0xTERM"
        className="h-14 w-14"
        draggable={false}
      />
      <div>Loading 0xTERM</div>
    </div>
  );
}

function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (!isCoarsePointer()) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setHeight(vv.height < window.innerHeight ? vv.height : null);
      });
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}

const V2Shell = dynamic(() => import("@/components/v2/V2Shell"), {
  ssr: false
});

const queryClient = new QueryClient();

export default function TerminalApp() {
  const [shellReady, setShellReady] = useState(false);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const vvHeight = useVisualViewportHeight();

  useEffect(() => {
    const hold = window.setTimeout(() => setMinHoldDone(true), 1000);
    import("@/components/v2/V2Shell").then(() => {
      setShellReady(true);
    });
    return () => window.clearTimeout(hold);
  }, []);

  const showSplash = !(shellReady && minHoldDone);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <main
          data-testid="v2-viewport-root"
          className="w-full h-dvh min-h-0 overflow-hidden relative bg-[#0b0d10]"
          style={vvHeight ? { height: vvHeight } : undefined}
        >
          {showSplash && (
            <div className="absolute inset-0 z-50">
              <Splash />
            </div>
          )}
          <V2Shell />
        </main>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
