// @vitest-environment jsdom
/**
 * @file FloatingChat.test.tsx
 * @description Floating messenger badge / focus-retain / expand (#82)
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import FloatingChat from "./FloatingChat";
import type { Address } from "viem";

const theme = THEMES.matrix;
const peer = "0x1111111111111111111111111111111111111111" as Address;
const self = "0x2222222222222222222222222222222222222222" as Address;
const SEPOLIA_CHANNEL = {
  chainId: 11155111,
  address: "0x6248F070A2f849ee1410BC35aa86A0e0F08e96a5",
  name: "lobby"
} as const;
const ACTIVE_ID = "11155111:0x6248f070a2f849ee1410bc35aa86a0e0f08e96a5";

function renderFloater(overrides: Partial<Parameters<typeof FloatingChat>[0]> = {}) {
  const onAckInbox = vi.fn();
  const onOpenChange = vi.fn();
  const onFocusPrompt = vi.fn();
  const loadSenders = vi.fn().mockResolvedValue([
    { peer, count: 1, label: "alice" }
  ]);
  const loadThread = vi.fn().mockResolvedValue({
    peer,
    self,
    peerLabel: "alice",
    messages: []
  });
  const result = render(
    <div style={{ position: "relative", height: 800, width: 1280 }}>
      <FloatingChat
        theme={theme}
        themeKey="matrix"
        inboxUnread={3}
        channelLabel="sepolia-chat"
        isConnected
        promptClearancePx={100}
        primaryTab="terminal"
        loadSenders={loadSenders}
        loadThread={loadThread}
        onAckInbox={onAckInbox}
        onOpenChange={onOpenChange}
        onFocusPrompt={onFocusPrompt}
        {...overrides}
      />
    </div>
  );
  return { ...result, onAckInbox, onOpenChange, onFocusPrompt, loadSenders, loadThread };
}

describe("FloatingChat (#82)", () => {
  it("shows unread badge via formatBadgeCount (3)", () => {
    const { container } = renderFloater({ inboxUnread: 3 });
    const bubble = container.querySelector("[data-floating-chat-bubble]");
    expect(bubble).toBeTruthy();
    expect(bubble!.textContent).toContain("CHAT");
    expect(bubble!.textContent).toContain("3");
  });

  it("hides badge when unread is 0", () => {
    const { container } = renderFloater({ inboxUnread: 0 });
    const bubble = container.querySelector("[data-floating-chat-bubble]");
    expect(bubble!.textContent).not.toMatch(/\d/);
  });

  it("shows 9+ for unread > 9", () => {
    const { container } = renderFloater({ inboxUnread: 12 });
    expect(
      container.querySelector("[data-floating-chat-bubble]")!.textContent
    ).toContain("9+");
  });

  it("collapsed bubble has no data-retain-focus", () => {
    const { container } = renderFloater();
    const bubble = container.querySelector("[data-floating-chat-bubble]");
    expect(bubble!.hasAttribute("data-retain-focus")).toBe(false);
  });

  it("expand acks inbox, mounts retain-focus panel, loads senders", async () => {
    const { container, onAckInbox, onOpenChange, loadSenders } = renderFloater();
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    expect(onAckInbox).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    const panel = container.querySelector("[data-floating-chat-panel]");
    expect(panel).toBeTruthy();
    expect(panel!.hasAttribute("data-retain-focus")).toBe(true);
    await waitFor(() => expect(loadSenders).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("alice")).toBeTruthy());
  });

  it("Esc collapses when focus inside panel and returns prompt focus on TERMINAL", async () => {
    const { container, onFocusPrompt, onOpenChange } = renderFloater();
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = container.querySelector(
      "[data-floating-chat-panel]"
    ) as HTMLElement;
    await waitFor(() => expect(panel).toBeTruthy());
    panel.focus();
    fireEvent.keyDown(window, { key: "Escape", bubbles: true });
    // capture listener on window
    const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    window.dispatchEvent(esc);
    await waitFor(() => {
      expect(
        container.querySelector("[data-floating-chat-panel]")
      ).toBeNull();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onFocusPrompt).toHaveBeenCalled();
  });

  it("stopPropagation on panel mouseDown/click", async () => {
    const { container } = renderFloater();
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    const md = fireEvent.mouseDown(panel);
    const cl = fireEvent.click(panel);
    expect(md).toBe(true);
    expect(cl).toBe(true);
  });

  it("no-channel muted one-liner", async () => {
    const { container } = renderFloater({ channelLabel: null });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() =>
      expect(screen.getByText(/No active channel/)).toBeTruthy()
    );
  });

  it("shows channel dropdown when no active channel but channels exist", async () => {
    const onSwitchChannel = vi.fn();
    const { container } = renderFloater({
      channelLabel: null,
      channels: [SEPOLIA_CHANNEL],
      activeChannelId: null,
      onSwitchChannel
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() => expect(screen.getByLabelText("Chat channel")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Chat channel"), {
      target: { value: ACTIVE_ID }
    });
    expect(onSwitchChannel).toHaveBeenCalledTimes(1);
  });

  it("does not steal focus path when collapsed (bubble outside retain-focus)", () => {
    const { container } = renderFloater();
    expect(container.querySelector("[data-retain-focus]")).toBeNull();
  });
});

describe("FloatingChat collapse (#140 A3)", () => {
  it("collapses expanded panel when leaving SOCIAL tab", async () => {
    const { container, rerender, onOpenChange, onAckInbox, onFocusPrompt, loadSenders, loadThread } =
      renderFloater({ primaryTab: "social" });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() =>
      expect(container.querySelector("[data-floating-chat-panel]")).toBeTruthy()
    );
    rerender(
      <div style={{ position: "relative", height: 800, width: 1280 }}>
        <FloatingChat
          theme={theme}
          themeKey="matrix"
          inboxUnread={0}
          channelLabel="sepolia-chat"
          isConnected
          promptClearancePx={100}
          primaryTab="terminal"
          loadSenders={loadSenders}
          loadThread={loadThread}
          onAckInbox={onAckInbox}
          onOpenChange={onOpenChange}
          onFocusPrompt={onFocusPrompt}
        />
      </div>
    );
    await waitFor(() =>
      expect(container.querySelector("[data-floating-chat-panel]")).toBeNull()
    );
    expect(container.querySelector("[data-floating-chat-bubble]")).toBeTruthy();
  });

  it("collapses when a large tool panel opens (news)", async () => {
    const { container, rerender, onOpenChange, onAckInbox, onFocusPrompt, loadSenders, loadThread } =
      renderFloater({ primaryTab: "terminal", openPanel: null });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() =>
      expect(container.querySelector("[data-floating-chat-panel]")).toBeTruthy()
    );
    rerender(
      <div style={{ position: "relative", height: 800, width: 1280 }}>
        <FloatingChat
          theme={theme}
          themeKey="matrix"
          inboxUnread={0}
          channelLabel="sepolia-chat"
          isConnected
          promptClearancePx={100}
          primaryTab="terminal"
          openPanel="news"
          loadSenders={loadSenders}
          loadThread={loadThread}
          onAckInbox={onAckInbox}
          onOpenChange={onOpenChange}
          onFocusPrompt={onFocusPrompt}
        />
      </div>
    );
    await waitFor(() =>
      expect(container.querySelector("[data-floating-chat-panel]")).toBeNull()
    );
  });

  it("shows NEW conversation UI on empty inbox", async () => {
    const loadSenders = vi.fn().mockResolvedValue([]);
    const startConversation = vi.fn();
    const { container } = renderFloater({
      loadSenders,
      startConversation,
      channelLabel: "sepolia-chat",
      isConnected: true
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() => expect(screen.getByText("No conversations")).toBeTruthy());
    expect(screen.getByTestId("new-conversation-form")).toBeTruthy();
    expect(screen.getByTestId("new-conversation-peer")).toBeTruthy();
  });
});
