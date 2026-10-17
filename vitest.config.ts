import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // issue-authorized: bytecode blob, not worth testing
        "src/components/terminal/implementationBytecode.ts",
        // solc wasm loader/worker glue — network + Worker; covered by dig unit tests
        "src/components/terminal/dig/solc.ts",
        // IndexedDB + command router need browser/worker; pure helpers tested separately (#39)
        "src/components/terminal/dig/idb.ts",
        "src/components/terminal/dig/runDig.ts",
        // poly command router (#20) — wallet/RPC/CLOB; pure helpers in poly/*.ts unit tests
        "src/components/terminal/poly/runPoly.ts",
        // Dig widgets are presentational chrome (Stephy lock); logic in dig/*.ts
        "src/components/terminal/widgets/DigEditorWidget.tsx",
        "src/components/terminal/widgets/DigArtifactWidget.tsx",
        "src/components/terminal/widgets/DigAbiWidget.tsx",
        "src/components/terminal/widgets/DigOpcodesWidget.tsx",
        "src/components/terminal/widgets/DigRunWidget.tsx",
        "src/components/terminal/widgets/DigConfirmWidget.tsx",
        "src/components/terminal/widgets/DigDebugWidget.tsx",
        // Settings panel (#81): presentational chrome; pure helpers in settingsPrefs.ts
        "src/components/terminal/widgets/SettingsPanel.tsx",
        // PERPS chrome (#190) — logic in hyperliquid/* unit tests
        "src/components/terminal/widgets/PerpsPanel.tsx",
        // Local wallet chrome (#29) — logic in lib/localWallet/* unit tests
        "src/components/terminal/widgets/WalletWidget.tsx",
        // localhost-only marketing page — pure presentational; prod landing is 0xterm-dot-xyz
        "src/app/page.tsx",
        // app entry — thin host gate; TerminalApp holds shell wiring (#78)
        "src/app/app/page.tsx",
        // terminal shell entry (extracted from app/page; viewport wiring #49/#78)
        "src/components/terminal/TerminalApp.tsx",
        // client host gate chrome — logic covered by hostRouting unit tests (#78)
        "src/components/HostRedirect.tsx",
        // issue-authorized (#6): wagmi-bound components whose pure logic lives in
        // covered modules — TerminalShell wires useAccount/AppKit; tx widgets call
        // wagmi hooks (writeContract/estimateGas) needing provider mocks
        "src/components/terminal/TerminalShell.tsx",
        // gchat CLI handler (#77) — extracted from TerminalShell; pure helpers in groupChat*/groupChatCrypto tests
        "src/components/terminal/gchatCommands.ts",
        "src/components/terminal/SwapWidget.tsx",
        "src/components/terminal/widgets/DeployWidget.tsx",
        "src/components/terminal/widgets/CreatePoolWidget.tsx",
        "src/components/terminal/widgets/AddLiquidityWidget.tsx",
        "src/components/terminal/widgets/InitializePoolWidget.tsx",
        // poly list/show chrome + trade/collateral (#20) — presentational / wagmi; logic in poly/*.ts
        "src/components/terminal/widgets/PolyWidget.tsx",
        "src/components/terminal/widgets/PolyTradeWidget.tsx",
        "src/components/terminal/widgets/PolyCollateralWidget.tsx",
        // mixer deposit/withdraw chrome (#111) — wagmi write; logic in mixer/*.ts
        "src/components/terminal/widgets/MixerDepositWidget.tsx",
        "src/components/terminal/widgets/MixerWithdrawWidget.tsx",
        // will action chrome (#26) — wagmi write/sim; logic in will/*.ts
        "src/components/terminal/widgets/WillActionWidget.tsx",
        // plan run chrome (#24) — wagmi confirm widgets; logic in plan/*.ts
        "src/components/terminal/widgets/PlanRunWidget.tsx",
        "src/components/terminal/widgets/PlanWidget.tsx",
        "src/components/terminal/widgets/WhenWidget.tsx",
        "src/components/terminal/when/runWhen.ts",
        "src/components/terminal/plan/runPlan.ts",
        // plan intent builder (#24) — live RPC/quote; pure serialize/drift/swapRebuild tested
        "src/components/terminal/plan/buildIntent.ts",
        "src/components/terminal/plan/vaultRebuild.ts",
        // wagmi provider/app glue + GA4 adapter — thin entry chrome (#6)
        "src/config/wagmi.ts",
        "src/app/layout.tsx",
        "src/app/app/layout.tsx",
        "src/app/providers.tsx",
        "src/lib/analytics.ts",
        "src/**/*.test.{ts,tsx}",
        // ambient module stubs — no runtime
        "src/types/**",
      ],
      thresholds: {
        // #6 gate — scoped to files we own (wagmi-bound chrome excluded above).
        // Measured 2026-09-22 against the scoped denominator: must hold
        // lines/statements/functions >=80, branches >=65. Raise with care.
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 65,
      },


    },
  },
});
