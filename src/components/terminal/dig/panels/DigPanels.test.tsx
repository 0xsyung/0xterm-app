// @vitest-environment jsdom
/**
 * @file DigPanels.test.tsx
 * @description DEV dig panel chrome + empty/filled Soft ACK paths (#166)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { THEMES } from "../../constants";
import DigVerPanel from "./DigVerPanel";
import DigSourcePanel from "./DigSourcePanel";
import DigArtifactPanel from "./DigArtifactPanel";
import DigAbiPanel from "./DigAbiPanel";
import DigOpcodesPanel from "./DigOpcodesPanel";
import DigSessionPanel from "./DigSessionPanel";
import DigCheckPanel from "./DigCheckPanel";
import DigDebugPanel from "./DigDebugPanel";
import DigDeployPanel from "./DigDeployPanel";
import DigAttachPanel from "./DigAttachPanel";
import { DigPanelShell, DigEmptyBody, DigPrimaryButton } from "./DigPanelShell";
import { flattenDig } from "./flattenDig";
import {
  addDigDeployment,
  resetDigSession,
  type DigRunPanelState
} from "../session";
import type { DigContractArtifact } from "../artifact";
import type { Address } from "viem";

const loadDigSource = vi.fn();
const saveDigSource = vi.fn();
const loadDigSolcVersion = vi.fn();
const saveDigSolcVersion = vi.fn();
const loadDigArtifacts = vi.fn();
const loadDigSourceRecents = vi.fn();
const pushDigSourceRecent = vi.fn();

vi.mock("../idb", () => ({
  loadDigSource: (...a: unknown[]) => loadDigSource(...a),
  saveDigSource: (...a: unknown[]) => saveDigSource(...a),
  loadDigSolcVersion: (...a: unknown[]) => loadDigSolcVersion(...a),
  saveDigSolcVersion: (...a: unknown[]) => saveDigSolcVersion(...a),
  loadDigArtifacts: (...a: unknown[]) => loadDigArtifacts(...a),
  loadDigSourceRecents: (...a: unknown[]) => loadDigSourceRecents(...a),
  pushDigSourceRecent: (...a: unknown[]) => pushDigSourceRecent(...a)
}));

vi.mock("../../widgets/DigEditorWidget", () => ({
  default: (props: {
    filename: string;
    mode?: string;
    embedded?: boolean;
    onChange?: (f: string, c: string) => void;
  }) => (
    <div data-testid="dig-editor-mock">
      {props.filename}:{props.mode}:{props.embedded ? "emb" : "card"}
      <button
        type="button"
        onClick={() => props.onChange?.(props.filename, "edited")}
      >
        dirty
      </button>
    </div>
  )
}));

vi.mock("../../widgets/DigArtifactWidget", () => ({
  default: ({ artifact }: { artifact: DigContractArtifact }) => (
    <div data-testid="dig-artifact-mock">{artifact.name}</div>
  )
}));

vi.mock("../../widgets/DigAbiWidget", () => ({
  default: ({ name }: { name: string }) => (
    <div data-testid="dig-abi-mock">{name}</div>
  )
}));

vi.mock("../../widgets/DigOpcodesWidget", () => ({
  default: ({
    name,
    truncated
  }: {
    name: string;
    truncated: boolean;
  }) => (
    <div data-testid="dig-opcodes-mock">
      {name}:{truncated ? "trunc" : "full"}
    </div>
  )
}));

vi.mock("../../widgets/DigRunWidget", () => ({
  default: ({ panel }: { panel: DigRunPanelState }) => (
    <div data-testid="dig-run-mock">{panel.name}</div>
  )
}));

vi.mock("../../widgets/DigConfirmWidget", () => ({
  default: ({
    onConfirm,
    onCancel
  }: {
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="dig-confirm-mock">
      <button type="button" onClick={() => void onConfirm()}>
        SEND
      </button>
      <button type="button" onClick={onCancel}>
        CANCEL
      </button>
    </div>
  )
}));

vi.mock("../../widgets/DigDebugWidget", () => ({
  default: ({
    panel,
    onCommand
  }: {
    panel: { stepIndex: number };
    onCommand?: (c: string) => void;
  }) => (
    <div data-testid="dig-debug-mock">
      step {panel.stepIndex}
      <button type="button" onClick={() => onCommand?.("dig step")}>
        STEP
      </button>
    </div>
  )
}));

const theme = THEMES.matrix;

const sampleArtifact: DigContractArtifact = {
  name: "Counter",
  solcVersion: "0.8.37",
  creationBytecode: "0x6000",
  runtimeBytecode: "0x6001600055",
  opcodes: "PUSH1 0x01 PUSH1 0x00 SSTORE",
  abi: [{ type: "function", name: "increment", inputs: [], outputs: [], stateMutability: "nonpayable" }]
};

const sampleRun: DigRunPanelState = {
  name: "Counter",
  address: "0x1234567890123456789012345678901234567890" as Address,
  env: "vm",
  events: [],
  gasLabel: "GAS USED",
  gas: "21k"
};

beforeEach(() => {
  resetDigSession();
  vi.clearAllMocks();
  loadDigSource.mockResolvedValue(null);
  saveDigSource.mockResolvedValue(undefined);
  loadDigSolcVersion.mockResolvedValue("0.8.37");
  saveDigSolcVersion.mockResolvedValue(undefined);
  loadDigArtifacts.mockResolvedValue([]);
  loadDigSourceRecents.mockResolvedValue([]);
  pushDigSourceRecent.mockResolvedValue([]);
  saveDigSource.mockImplementation(async (fn: string, body: string) => {
    await pushDigSourceRecent(fn, body);
  });
});

describe("flattenDig", () => {
  it("flattens nested arrays", () => {
    expect(
      flattenDig([
        { kind: "text", text: "a" },
        [{ kind: "text", text: "b" }]
      ]).map((r) => (r.kind === "text" ? r.text : ""))
    ).toEqual(["a", "b"]);
  });
});

describe("DigPanelShell", () => {
  it("closes on × and Escape", () => {
    const onClose = vi.fn();
    render(
      <DigPanelShell theme={theme} title="TEST" onClose={onClose} testId="shell">
        <DigEmptyBody theme={theme} message="hi" />
        <DigPrimaryButton theme={theme} label="GO" onClick={vi.fn()} />
      </DigPanelShell>
    );
    fireEvent.click(screen.getByTestId("shell-close"));
    expect(onClose).toHaveBeenCalled();
    onClose.mockClear();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DigVerPanel (#166)", () => {
  it("renders active version + chips + footer; pick saves", async () => {
    render(<DigVerPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("dig-ver-active").textContent).toBe("0.8.37");
    });
    expect(screen.getByText(/wasm only · matches dig ver/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-ver-chip-0.8.28"));
    });
    await waitFor(() => {
      expect(saveDigSolcVersion).toHaveBeenCalledWith("0.8.28");
      expect(screen.getByTestId("dig-ver-active").textContent).toBe("0.8.28");
    });
  });
});

describe("DigSourcePanel unified EDITOR (#198)", () => {
  it("restores IDB on mount — never Counter overwrite", async () => {
    loadDigSource.mockResolvedValue({
      filename: "Vault.sol",
      content: "contract Vault {}",
      updatedAt: Date.now()
    });
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("dig-source-panel")).toBeTruthy();
      expect(screen.getByTestId("dig-editor-mock").textContent).toMatch(/Vault\.sol/);
    });
    expect(saveDigSource).not.toHaveBeenCalled();
    expect(screen.queryByText(/Replace buffer/)).toBeNull();
  });

  it("empty Soft ACK when no IDB source", async () => {
    loadDigSource.mockResolvedValue(null);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(
        screen.getByText("No saved source. NEW or OPEN a .sol file.")
      ).toBeTruthy();
    });
  });

  it("NEW confirms when IDB non-empty", async () => {
    loadDigSource.mockResolvedValue({
      filename: "Vault.sol",
      content: "contract Vault {}",
      updatedAt: Date.now()
    });
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-new"));
    fireEvent.click(screen.getByTestId("dig-source-action-new"));
    await waitFor(() => {
      expect(
        screen.getByText("Replace buffer with Counter template?")
      ).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-confirm-ok"));
    });
    await waitFor(() => {
      expect(saveDigSource).toHaveBeenCalled();
    });
  });

  it("OPEN enters Choose .sol file phase", async () => {
    loadDigSource.mockResolvedValue(null);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-open"));
    fireEvent.click(screen.getByTestId("dig-source-action-open"));
    await waitFor(() => {
      expect(screen.getByTestId("dig-source-choose")).toBeTruthy();
      expect(screen.getByText(/Esc closes · no silent disk read/)).toBeTruthy();
    });
  });

  it("SAVE AS triggers download ack", async () => {
    loadDigSource.mockResolvedValue({
      filename: "Foo.sol",
      content: "pragma solidity ^0.8.37;",
      updatedAt: Date.now()
    });
    const createObjectURL = vi.fn(() => "blob:mock");
    const revoke = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revoke;
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-save-as"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-action-save-as"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("dig-source-download-ack").textContent).toMatch(
        /Downloaded Foo\.sol/
      );
    });
  });

  it("RECENT strip shows and loads", async () => {
    loadDigSource.mockResolvedValue({
      filename: "A.sol",
      content: "contract A {}",
      updatedAt: 1
    });
    loadDigSourceRecents.mockResolvedValue([
      { filename: "B.sol", content: "contract B {}", updatedAt: 2 }
    ]);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-recents"));
    expect(screen.getByText("B.sol")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("B.sol"));
    });
    await waitFor(() => {
      expect(saveDigSource).toHaveBeenCalledWith("B.sol", "contract B {}");
    });
  });
});

describe("DigArtifactPanel (#166)", () => {
  it("empty Soft ACK + COMPILE CTA runs onDig", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "artifact",
      artifact: sampleArtifact,
      title: "ARTIFACT"
    });
    render(
      <DigArtifactPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    await waitFor(() => {
      expect(screen.getByText("No artifact. Compile source first.")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-compile-cta"));
    });
    await waitFor(() => {
      expect(onDig).toHaveBeenCalledWith("dig compile");
      expect(screen.getByTestId("dig-artifact-mock").textContent).toBe("Counter");
    });
  });

  it("shows warn text from dig compile failure", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "text",
      text: "[!] dig.no_source",
      warn: true
    });
    render(
      <DigArtifactPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    await waitFor(() => screen.getByTestId("dig-compile-cta"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-compile-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText("[!] dig.no_source")).toBeTruthy();
    });
  });

  it("renders filled artifact from IDB", async () => {
    loadDigArtifacts.mockResolvedValue([sampleArtifact]);
    render(
      <DigArtifactPanel theme={theme} onClose={vi.fn()} onDig={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId("dig-artifact-mock").textContent).toBe("Counter");
    });
  });

  it("multi-text compile failure", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "multi-text",
      lines: [
        { text: "[!] dig.compile_fail", warn: true },
        { text: "ParserError", warn: true }
      ]
    });
    render(
      <DigArtifactPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    await waitFor(() => screen.getByTestId("dig-compile-cta"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-compile-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText("[!] dig.compile_fail")).toBeTruthy();
    });
  });
});

describe("DigAbiPanel / DigOpcodesPanel (#166)", () => {
  it("ABI empty Soft ACK", async () => {
    render(<DigAbiPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("No artifact. Compile source first.")).toBeTruthy();
    });
  });

  it("ABI filled", async () => {
    loadDigArtifacts.mockResolvedValue([sampleArtifact]);
    render(<DigAbiPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("dig-abi-mock").textContent).toBe("Counter");
    });
  });

  it("OPCODES empty Soft ACK", async () => {
    render(<DigOpcodesPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("No artifact. Compile source first.")).toBeTruthy();
    });
  });

  it("OPCODES filled", async () => {
    loadDigArtifacts.mockResolvedValue([sampleArtifact]);
    render(<DigOpcodesPanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("dig-opcodes-mock").textContent).toMatch(/Counter/);
    });
  });
});

describe("DigSessionPanel (#166)", () => {
  it("empty Soft ACK", () => {
    render(<DigSessionPanel theme={theme} onClose={vi.fn()} />);
    expect(screen.getByText("No deploys this session.")).toBeTruthy();
  });

  it("lists rows and fills prompt", () => {
    addDigDeployment({
      name: "Counter",
      address: sampleRun.address,
      env: "vm",
      abi: sampleArtifact.abi
    });
    const onFillPrompt = vi.fn();
    render(
      <DigSessionPanel theme={theme} onClose={vi.fn()} onFillPrompt={onFillPrompt} />
    );
    fireEvent.click(screen.getByText("Counter"));
    expect(onFillPrompt).toHaveBeenCalledWith(
      expect.stringContaining("dig at 0x1234")
    );
  });
});

describe("DigCheckPanel (#166)", () => {
  it("empty address Soft ACK", () => {
    render(<DigCheckPanel theme={theme} onClose={vi.fn()} onCheck={vi.fn()} />);
    fireEvent.click(screen.getByTestId("dig-check-cta"));
    expect(screen.getByText("Enter a token address.")).toBeTruthy();
  });

  it("CHECK success shows lines", async () => {
    const onCheck = vi.fn().mockResolvedValue({
      ok: true,
      lines: ["[✓] is erc20"]
    });
    render(<DigCheckPanel theme={theme} onClose={vi.fn()} onCheck={onCheck} />);
    fireEvent.change(screen.getByTestId("dig-check-address"), {
      target: { value: "0xabc" }
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-check-cta"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("dig-check-result").textContent).toMatch(/erc20/);
    });
  });

  it("CHECK error shows message", async () => {
    const onCheck = vi.fn().mockResolvedValue({
      ok: false,
      error: "Select network first."
    });
    render(<DigCheckPanel theme={theme} onClose={vi.fn()} onCheck={onCheck} />);
    fireEvent.change(screen.getByTestId("dig-check-address"), {
      target: { value: "0xabc" }
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-check-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText("Select network first.")).toBeTruthy();
    });
  });
});

describe("DigDebugPanel (#166)", () => {
  it("empty Soft ACK when no tx", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "text",
      text: "[!] dig.no_tx — no tx to debug.",
      warn: true
    });
    render(<DigDebugPanel theme={theme} onClose={vi.fn()} onDig={onDig} />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "No tx to debug. Deploy/send in VM or dig debug <txhash>."
        )
      ).toBeTruthy();
    });
  });

  it("shows DigDebugWidget and steps", async () => {
    const onDig = vi
      .fn()
      .mockResolvedValueOnce({
        kind: "debug",
        panel: {
          stepIndex: 0,
          totalSteps: 3,
          status: "OK",
          truncated: false,
          pc: 0,
          op: "PUSH1",
          gas: "1",
          stackTop8: [],
          opcodeRows: [],
          hasSourceMap: false,
          breakpoints: []
        }
      })
      .mockResolvedValueOnce({
        kind: "debug",
        panel: {
          stepIndex: 1,
          totalSteps: 3,
          status: "OK",
          truncated: false,
          pc: 1,
          op: "PUSH1",
          gas: "1",
          stackTop8: [],
          opcodeRows: [],
          hasSourceMap: false,
          breakpoints: []
        }
      });
    render(<DigDebugPanel theme={theme} onClose={vi.fn()} onDig={onDig} />);
    await waitFor(() => {
      expect(screen.getByTestId("dig-debug-mock").textContent).toMatch(/step 0/);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("STEP"));
    });
    await waitFor(() => {
      expect(onDig).toHaveBeenCalledWith("dig step");
      expect(screen.getByTestId("dig-debug-mock").textContent).toMatch(/step 1/);
    });
  });
});

describe("DigDeployPanel (#166)", () => {
  it("VM deploy success shows DigRun", async () => {
    const onDig = vi.fn().mockResolvedValue({ kind: "run", panel: sampleRun });
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={onDig}
        onConfirmDeploy={vi.fn()}
        isConnected={false}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("dig-run-mock").textContent).toBe("Counter");
    });
  });

  it("wallet without connection Soft ACK", async () => {
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={vi.fn()}
        onConfirmDeploy={vi.fn()}
        isConnected={false}
      />
    );
    fireEvent.click(screen.getByText("WALLET"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText("Connect wallet or use VM.")).toBeTruthy();
    });
  });

  it("confirm path → SEND → DigRun", async () => {
    const confirm = {
      kind: "confirm" as const,
      to: "0x0000000000000000000000000000000000000000" as Address,
      data: "0x" as `0x${string}`,
      dataSummary: "Counter constructor",
      value: 0n,
      gasEstimate: 100000n,
      intent: "deploy" as const,
      contractName: "Counter",
      abi: sampleArtifact.abi,
      artifact: sampleArtifact
    };
    const onDig = vi.fn().mockResolvedValue(confirm);
    const onConfirmDeploy = vi.fn().mockResolvedValue(sampleRun);
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={onDig}
        onConfirmDeploy={onConfirmDeploy}
        isConnected={true}
      />
    );
    fireEvent.click(screen.getByText("WALLET"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => screen.getByTestId("dig-confirm-mock"));
    await act(async () => {
      fireEvent.click(screen.getByText("SEND"));
    });
    await waitFor(() => {
      expect(onConfirmDeploy).toHaveBeenCalled();
      expect(screen.getByTestId("dig-run-mock")).toBeTruthy();
    });
  });
});

describe("DigAttachPanel (#166)", () => {
  it("requires address", async () => {
    render(
      <DigAttachPanel theme={theme} onClose={vi.fn()} onDig={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("dig-attach-cta"));
    expect(screen.getByText("0x… address required")).toBeTruthy();
  });

  it("ATTACH success shows DigRun", async () => {
    const onDig = vi.fn().mockResolvedValue({ kind: "run", panel: sampleRun });
    render(
      <DigAttachPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    fireEvent.change(screen.getByTestId("dig-attach-address"), {
      target: { value: sampleRun.address }
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-attach-cta"));
    });
    await waitFor(() => {
      expect(onDig).toHaveBeenCalledWith(`dig at ${sampleRun.address}`);
      expect(screen.getByTestId("dig-run-mock")).toBeTruthy();
    });
  });

  it("ATTACH with optional name", async () => {
    const onDig = vi.fn().mockResolvedValue({ kind: "run", panel: sampleRun });
    render(
      <DigAttachPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    fireEvent.change(screen.getByTestId("dig-attach-address"), {
      target: { value: sampleRun.address }
    });
    fireEvent.change(screen.getByTestId("dig-attach-name"), {
      target: { value: "Counter" }
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-attach-cta"));
    });
    await waitFor(() => {
      expect(onDig).toHaveBeenCalledWith(
        `dig at ${sampleRun.address} Counter`
      );
    });
  });
});

describe("DigDeployPanel extras (#166)", () => {
  it("shows dig warn text", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "text",
      text: "[!] dig.no_artifact — no artifact.",
      warn: true
    });
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={onDig}
        onConfirmDeploy={vi.fn()}
        isConnected={true}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText(/dig.no_artifact/)).toBeTruthy();
    });
  });

  it("confirm CANCEL returns to form", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "confirm",
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
      dataSummary: "ctor",
      value: 0n,
      gasEstimate: 1n,
      intent: "deploy",
      contractName: "Counter",
      abi: sampleArtifact.abi
    });
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={onDig}
        onConfirmDeploy={vi.fn()}
        isConnected={true}
      />
    );
    fireEvent.click(screen.getByText("WALLET"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => screen.getByTestId("dig-confirm-mock"));
    fireEvent.click(screen.getByText("CANCEL"));
    await waitFor(() => {
      expect(screen.getByTestId("dig-deploy-cta")).toBeTruthy();
    });
  });

  it("confirm SEND error surfaces", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "confirm",
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
      dataSummary: "ctor",
      value: 0n,
      gasEstimate: 1n,
      intent: "deploy",
      contractName: "Counter",
      abi: sampleArtifact.abi
    });
    const onConfirmDeploy = vi.fn().mockResolvedValue({ error: "boom" });
    render(
      <DigDeployPanel
        theme={theme}
        onClose={vi.fn()}
        onDig={onDig}
        onConfirmDeploy={onConfirmDeploy}
        isConnected={true}
      />
    );
    fireEvent.click(screen.getByText("WALLET"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-deploy-cta"));
    });
    await waitFor(() => screen.getByTestId("dig-confirm-mock"));
    await act(async () => {
      fireEvent.click(screen.getByText("SEND"));
    });
    await waitFor(() => {
      expect(screen.getByText("boom")).toBeTruthy();
    });
  });
});

describe("DigDebugPanel stop (#166)", () => {
  it("stop clears panel to empty Soft ACK", async () => {
    const onDig = vi
      .fn()
      .mockResolvedValueOnce({
        kind: "debug",
        panel: {
          stepIndex: 0,
          totalSteps: 1,
          status: "OK",
          truncated: false,
          pc: 0,
          op: "STOP",
          gas: "1",
          stackTop8: [],
          opcodeRows: [],
          hasSourceMap: false,
          breakpoints: []
        }
      })
      .mockResolvedValueOnce({ kind: "debug", panel: {
          stepIndex: 0,
          totalSteps: 1,
          status: "OK",
          truncated: false,
          pc: 0,
          op: "STOP",
          gas: "1",
          stackTop8: [],
          opcodeRows: [],
          hasSourceMap: false,
          breakpoints: []
        }, stop: true });
    render(<DigDebugPanel theme={theme} onClose={vi.fn()} onDig={onDig} />);
    await waitFor(() => screen.getByTestId("dig-debug-mock"));
    await act(async () => {
      fireEvent.click(screen.getByText("STEP"));
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          "No tx to debug. Deploy/send in VM or dig debug <txhash>."
        )
      ).toBeTruthy();
    });
  });
});

describe("DigAttachPanel error (#166)", () => {
  it("shows dig text error", async () => {
    const onDig = vi.fn().mockResolvedValue({
      kind: "text",
      text: "[!] dig.no_artifact",
      warn: true
    });
    render(
      <DigAttachPanel theme={theme} onClose={vi.fn()} onDig={onDig} />
    );
    fireEvent.change(screen.getByTestId("dig-attach-address"), {
      target: { value: sampleRun.address }
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-attach-cta"));
    });
    await waitFor(() => {
      expect(screen.getByText("[!] dig.no_artifact")).toBeTruthy();
    });
  });
});


describe("DigSourcePanel confirms (#198)", () => {
  it("OPEN when dirty asks Discard", async () => {
    loadDigSource.mockResolvedValue({
      filename: "A.sol",
      content: "hello",
      updatedAt: 1
    });
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-editor-mock"));
    fireEvent.click(screen.getByText("dirty"));
    await waitFor(() => {
      expect(screen.getByText(/● unsaved/)).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("dig-source-action-open"));
    await waitFor(() => {
      expect(screen.getByText("Discard unsaved changes?")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-confirm-ok"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("dig-source-choose")).toBeTruthy();
    });
  });

  it("NEW CANCEL leaves buffer", async () => {
    loadDigSource.mockResolvedValue({
      filename: "Keep.sol",
      content: "keep",
      updatedAt: 1
    });
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-new"));
    fireEvent.click(screen.getByTestId("dig-source-action-new"));
    await waitFor(() => screen.getByTestId("dig-source-confirm-cancel"));
    fireEvent.click(screen.getByTestId("dig-source-confirm-cancel"));
    await waitFor(() => {
      expect(screen.queryByTestId("dig-source-confirm")).toBeNull();
      expect(screen.getByTestId("dig-editor-mock").textContent).toMatch(/Keep\.sol/);
    });
  });

  it("empty NEW without confirm seeds Counter", async () => {
    loadDigSource.mockResolvedValue(null);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-new"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-action-new"));
    });
    await waitFor(() => {
      expect(saveDigSource).toHaveBeenCalled();
      expect(screen.queryByText(/Replace buffer/)).toBeNull();
    });
  });
});

describe("DigSourcePanel OPEN pick + SAVE AS picker (#198)", () => {
  it("file input loads .sol into buffer", async () => {
    loadDigSource.mockResolvedValue(null);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-open"));
    fireEvent.click(screen.getByTestId("dig-source-action-open"));
    await waitFor(() => screen.getByTestId("dig-source-choose"));
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["pragma solidity ^0.8.37;"], "Picked.sol", {
      type: "text/plain"
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(saveDigSource).toHaveBeenCalledWith(
        "Picked.sol",
        "pragma solidity ^0.8.37;"
      );
    });
  });

  it("SAVE AS uses showSaveFilePicker when available", async () => {
    loadDigSource.mockResolvedValue({
      filename: "Pick.sol",
      content: "hi",
      updatedAt: 1
    });
    const write = vi.fn();
    const close = vi.fn();
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    (window as any).showSaveFilePicker = showSaveFilePicker;
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-source-action-save-as"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-action-save-as"));
    });
    await waitFor(() => {
      expect(showSaveFilePicker).toHaveBeenCalled();
      expect(write).toHaveBeenCalledWith("hi");
      expect(screen.getByTestId("dig-source-download-ack").textContent).toMatch(
        /Downloaded Pick\.sol/
      );
    });
    delete (window as any).showSaveFilePicker;
  });

  it("RECENT when dirty asks Discard then loads", async () => {
    loadDigSource.mockResolvedValue({
      filename: "A.sol",
      content: "a",
      updatedAt: 1
    });
    loadDigSourceRecents.mockResolvedValue([
      { filename: "B.sol", content: "b", updatedAt: 2 }
    ]);
    render(<DigSourcePanel theme={theme} onClose={vi.fn()} />);
    await waitFor(() => screen.getByTestId("dig-editor-mock"));
    fireEvent.click(screen.getByText("dirty"));
    await waitFor(() => screen.getByText(/● unsaved/));
    fireEvent.click(screen.getByText("B.sol"));
    await waitFor(() => {
      expect(screen.getByText("Discard unsaved changes?")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("dig-source-confirm-ok"));
    });
    await waitFor(() => {
      expect(saveDigSource).toHaveBeenCalledWith("B.sol", "b");
    });
  });
});

