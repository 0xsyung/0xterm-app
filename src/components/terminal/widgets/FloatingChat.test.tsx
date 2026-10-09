// @vitest-environment jsdom
/**
 * @file FloatingChat.test.tsx
 * @description Floating messenger badge / focus-retain / expand (#82)
 */
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { THEMES } from "../constants";
import FloatingChat from "./FloatingChat";
import type { Address } from "viem";
import { channelId, type ChatChannel } from "../chatChannels";

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

  it("no-channel body drops the old 'No active channel' line and nudges to the header (#183)", async () => {
    const { container } = renderFloater({
      channelLabel: null,
      channels: [SEPOLIA_CHANNEL],
      activeChannelId: null
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    const body = panel.children[1] as HTMLElement;
    expect(within(body).queryByText(/No active channel/)).toBeNull();
    const nudge = within(body).getByText("Pick a channel above.");
    expect(nudge.className).toContain(theme.muted);
    // Placeholder lives only in the header select now.
    const sel = within(headerOf(container)).getByLabelText("Chat channel") as HTMLSelectElement;
    expect(sel.options[0].textContent).toBe("No active channel");
  });

  it("no-channel body stays empty when there is nothing to pick (#183)", async () => {
    const { container, loadSenders } = renderFloater({ channelLabel: null });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    await waitFor(() => expect(loadSenders).toHaveBeenCalled());
    const body = panel.children[1] as HTMLElement;
    expect(within(body).queryByText(/No active channel/)).toBeNull();
    expect(within(body).queryByText("Pick a channel above.")).toBeNull();
  });

  it("disconnected copy is unchanged and never shows the pick nudge (#183)", async () => {
    const { container } = renderFloater({
      isConnected: false,
      channelLabel: null,
      channels: [SEPOLIA_CHANNEL],
      activeChannelId: null
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    const line = within(panel).getByText("Connect a wallet to read chat.");
    expect(line.className).toContain(theme.muted);
    expect(within(panel).queryByText("Pick a channel above.")).toBeNull();
    expect(within(panel.children[1] as HTMLElement).queryByText(/No active channel/)).toBeNull();
  });

  it("disconnected copy also shows with an active channel (#183)", async () => {
    const { container } = renderFloater({ isConnected: false });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    await waitFor(() =>
      expect(screen.getByText("Connect a wallet to read chat.")).toBeTruthy()
    );
  });

  it("panel min-width never exceeds the viewport (sub-296px clip, #183)", async () => {
    const { container } = renderFloater();
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    const minW = panel.style.minWidth.replace(/\s+/g, "");
    const w = panel.style.width.replace(/\s+/g, "");
    // jsdom normalises calc() (e.g. "min(280px,-16px+100vw)"), so match parts.
    expect(minW).toMatch(/^min\(280px,/);
    expect(minW).toContain("100vw");
    expect(minW).toContain("16px");
    expect(minW).not.toBe("280px");
    expect(w).toContain("100vw");
    expect(w).toContain("360px");
  });

  it("header dropdown still renders with placeholder when no active channel (#172)", async () => {
    const onSwitchChannel = vi.fn();
    const { container } = renderFloater({
      channelLabel: null,
      channels: [SEPOLIA_CHANNEL],
      activeChannelId: null,
      onSwitchChannel
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const header = await waitFor(() => headerOf(container));
    const sel = within(header).getByLabelText("Chat channel") as HTMLSelectElement;
    expect(sel.value).toBe("");
    expect(sel.options[0].textContent).toBe("No active channel");
    fireEvent.change(sel, { target: { value: ACTIVE_ID } });
    expect(onSwitchChannel).toHaveBeenCalledTimes(1);
  });

  it("header dropdown renders without channels prop (no crash)", async () => {
    const { container } = renderFloater({ channelLabel: null });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const header = await waitFor(() => headerOf(container));
    const sel = within(header).getByLabelText("Chat channel") as HTMLSelectElement;
    expect(sel.options.length).toBe(1);
    expect(sel.options[0].textContent).toBe("No active channel");
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

  it("collapses expanded panel when entering SETTINGS (#182)", async () => {
    const { container, rerender, onOpenChange, onAckInbox, onFocusPrompt, loadSenders, loadThread } =
      renderFloater({ primaryTab: "terminal" });
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
          primaryTab="settings"
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

const OTHER_CHANNEL: ChatChannel = {
  chainId: 11155111,
  address: "0x3333333333333333333333333333333333333333",
  name: "desk",
  source: "saved"
};
const OTHER_ID = channelId(OTHER_CHANNEL.chainId, OTHER_CHANNEL.address);

function headerOf(container: HTMLElement): HTMLElement {
  const panel = container.querySelector("[data-floating-chat-panel]");
  if (!panel) throw new Error("panel not open");
  return panel.firstElementChild as HTMLElement;
}

describe("FloatingChat header channel dropdown (#172)", () => {
  it("renders in the header when a channel is active, with it selected", async () => {
    const { container } = renderFloater({
      channelLabel: "lobby",
      channels: [SEPOLIA_CHANNEL, OTHER_CHANNEL],
      activeChannelId: ACTIVE_ID,
      onSwitchChannel: vi.fn()
    });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const header = await waitFor(() => headerOf(container));
    expect(header.textContent).toContain("CHAT");
    expect(header.textContent).not.toContain("CHAT · lobby");
    // Header variant hides the "Channel" caption (aria-label carries it).
    expect(within(header).queryByText("Channel")).toBeNull();
    const sel = within(header).getByLabelText("Chat channel") as HTMLSelectElement;
    expect(sel.value).toBe(ACTIVE_ID);
    expect(sel.selectedOptions[0].textContent).toContain("lobby");
    expect(sel.options.length).toBe(2);
    // Collapse control still lives in the header and works.
    fireEvent.click(within(header).getByLabelText("Collapse chat"));
    await waitFor(() =>
      expect(container.querySelector("[data-floating-chat-panel]")).toBeNull()
    );
  });

  it("switching channel calls the shared switch path, resets thread, reloads senders", async () => {
    const onSwitch = vi.fn();
    const sendersFor: Record<string, { peer: Address; count: number; label: string }[]> = {
      [ACTIVE_ID]: [{ peer, count: 1, label: "alice" }],
      [OTHER_ID]: [{ peer: self, count: 2, label: "bob" }]
    };
    const channels: ChatChannel[] = [SEPOLIA_CHANNEL, OTHER_CHANNEL];

    function Harness() {
      const [active, setActive] = useState<string>(ACTIVE_ID);
      const label = channels.find((c) => channelId(c.chainId, c.address) === active)!.name;
      return (
        <div style={{ position: "relative", height: 800, width: 1280 }}>
          <FloatingChat
            theme={theme}
            themeKey="matrix"
            inboxUnread={0}
            channelLabel={label}
            isConnected
            promptClearancePx={100}
            primaryTab="social"
            channels={channels}
            activeChannelId={active}
            onSwitchChannel={(ch) => {
              onSwitch(ch);
              setActive(channelId(ch.chainId, ch.address));
            }}
            loadSenders={async () => sendersFor[active]}
            loadThread={async (p) => ({
              peer: p,
              self,
              peerLabel: p === peer ? "alice" : "bob",
              messages: []
            })}
            onAckInbox={() => {}}
          />
        </div>
      );
    }

    const { container } = render(<Harness />);
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    fireEvent.click(await screen.findByText("alice"));
    await screen.findByText(/threads/);

    const sel = within(headerOf(container)).getByLabelText("Chat channel") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: OTHER_ID } });

    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onSwitch).toHaveBeenCalledWith(expect.objectContaining({ name: "desk" }));
    await screen.findByText("bob");
    expect(screen.queryByText(/threads/)).toBeNull();
    expect(screen.queryByText("alice")).toBeNull();
    expect(
      (within(headerOf(container)).getByLabelText("Chat channel") as HTMLSelectElement).value
    ).toBe(OTHER_ID);
  });
});

describe("FloatingChat inbox / thread paths", () => {
  const open = (container: HTMLElement) =>
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);

  it("surfaces loadSenders error message", async () => {
    const { container } = renderFloater({
      loadSenders: vi.fn().mockRejectedValue(new Error("rpc down"))
    });
    open(container);
    expect(await screen.findByText("rpc down")).toBeTruthy();
  });

  it("falls back to generic inbox error for non-Error rejections", async () => {
    const { container } = renderFloater({
      loadSenders: vi.fn().mockRejectedValue("nope")
    });
    open(container);
    expect(await screen.findByText("Failed to load inbox.")).toBeTruthy();
  });

  it("shows thread load error and stays on the list", async () => {
    const { container } = renderFloater({
      loadThread: vi.fn().mockRejectedValue({ message: "" })
    });
    open(container);
    fireEvent.click(await screen.findByText("alice"));
    expect(await screen.findByText("Failed to load thread.")).toBeTruthy();
    expect(screen.queryByText(/threads/)).toBeNull();
  });

  it("sends in an open thread, reloads thread + senders, back returns to list", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const { container, loadThread, loadSenders } = renderFloater({ sendMessage });
    open(container);
    fireEvent.click(await screen.findByText("alice"));
    await screen.findByText(/threads/);
    const sendersCalls = loadSenders.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "gm" } });
    fireEvent.click(screen.getByLabelText("Send"));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(peer, "gm"));
    await waitFor(() => expect(loadThread).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(loadSenders.mock.calls.length).toBeGreaterThan(sendersCalls)
    );
    fireEvent.click(screen.getByText(/threads/));
    await screen.findByText("alice");
    expect(screen.queryByText(/threads/)).toBeNull();
  });

  it("starts a new conversation and opens its thread", async () => {
    const startConversation = vi.fn().mockResolvedValue(peer);
    const { container, loadThread } = renderFloater({
      loadSenders: vi.fn().mockResolvedValue([]),
      startConversation
    });
    open(container);
    await screen.findByText("No conversations");
    fireEvent.change(screen.getByTestId("new-conversation-peer"), {
      target: { value: "alice.eth" }
    });
    fireEvent.change(screen.getByTestId("new-conversation-message"), {
      target: { value: "hi" }
    });
    fireEvent.click(screen.getByTestId("new-conversation-send"));
    await waitFor(() =>
      expect(startConversation).toHaveBeenCalledWith("alice.eth", "hi")
    );
    await waitFor(() => expect(loadThread).toHaveBeenCalledWith(peer));
    expect(await screen.findByText(/threads/)).toBeTruthy();
  });

  it("ignores non-Escape keys and Escape when focus is outside the panel", async () => {
    const { container } = renderFloater();
    open(container);
    await screen.findByText("alice");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    (document.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(container.querySelector("[data-floating-chat-panel]")).toBeTruthy();
  });
});

describe("FloatingChat mobile height cap (#185)", () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  let headerEl: HTMLDivElement | null = null;

  beforeEach(() => {
    class FakeRO {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(target: Element) {
        this.cb(
          [{ target } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", FakeRO);

    headerEl = document.createElement("div");
    headerEl.setAttribute("data-terminal-header", "");
    Object.defineProperty(headerEl, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        height: 180,
        width: 390,
        top: 0,
        left: 0,
        bottom: 180,
        right: 390,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        }
      })
    });
    document.body.appendChild(headerEl);

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844
    });
  });

  afterEach(() => {
    headerEl?.remove();
    headerEl = null;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalHeight
    });
    vi.unstubAllGlobals();
  });

  it("caps panel height so it clears measured top chrome on narrow CONSOLE-sized viewports", async () => {
    const { container } = renderFloater({ promptClearancePx: 188 });
    // bubbleBottom = 188 + 12 = 200; available = 844 - 180 - 8 - 200 = 456
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    await waitFor(() => {
      expect(panel.getAttribute("data-floating-chat-layout")).toBe("anchored");
      expect(panel.style.height).toBe("456px");
      expect(panel.style.maxHeight).toBe("456px");
    });
    // Header chrome unchanged: 49px row (py-2 + content), × stays 32×32 (+ coarse 44).
    const header = panel.children[0] as HTMLElement;
    expect(header.className).toMatch(/py-2/);
    const closeBtn = within(header).getByLabelText("Collapse chat");
    expect(closeBtn.className).toMatch(/w-8/);
    expect(closeBtn.className).toMatch(/h-8/);
    expect(panel.className).toMatch(/z-\[25\]/);
  });

  it("uses a full-width sheet when available height is under ~200px", async () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 500
    });
    window.dispatchEvent(new Event("resize"));
    const { container } = renderFloater({ promptClearancePx: 148 });
    // bubbleBottom = 160; available = 500 - 180 - 8 - 160 = 152 < 200
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    await waitFor(() => {
      expect(panel.getAttribute("data-floating-chat-layout")).toBe("sheet");
      expect(panel.style.top).toBe("188px"); // 180 + 8
      expect(panel.style.left).toBe("0px");
      expect(panel.style.width).toBe("100%");
      expect(panel.style.bottom).toBe("160px");
    });
  });

  it("sheet overrides bottom so header row stays ≥49px (390×400 QA)", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 400
    });
    // beforeEach header getBoundingClientRect height is 180; for this case use 128
    // so top = 136 like Alex's repro.
    Object.defineProperty(headerEl!, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        height: 128,
        width: 390,
        top: 0,
        left: 0,
        bottom: 128,
        right: 390,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        }
      })
    });
    window.dispatchEvent(new Event("resize"));
    // bubbleBottom = 218 + 12 = 230; raw available = 400 - 128 - 8 - 230 = 34
    const { container } = renderFloater({ promptClearancePx: 218 });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    await waitFor(() => {
      expect(panel.getAttribute("data-floating-chat-layout")).toBe("sheet");
      expect(panel.style.top).toBe("136px");
      expect(Number.parseFloat(panel.style.height)).toBeGreaterThanOrEqual(49);
      expect(panel.style.height).toBe("49px");
      expect(Number.parseFloat(panel.style.bottom)).toBeLessThan(230);
      expect(panel.style.bottom).toBe("215px"); // 400 - 136 - 49
    });
  });

  it("keeps ≥768 layout as min(60vh, 480) even with a tall measured chrome", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 768
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1024
    });
    window.dispatchEvent(new Event("resize"));
    const { container } = renderFloater({ promptClearancePx: 200 });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    const panel = (await waitFor(() =>
      container.querySelector("[data-floating-chat-panel]")
    )) as HTMLElement;
    await waitFor(() => {
      expect(panel.getAttribute("data-floating-chat-layout")).toBe("anchored");
      expect(panel.style.height.replace(/\s+/g, "")).toMatch(/min\(60vh,/);
      expect(panel.style.maxHeight).toBe("480px");
      expect(panel.style.top).toBe("");
    });
  });
});
