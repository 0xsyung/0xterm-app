// @vitest-environment jsdom
/**
 * @file FloatingChat.test.tsx
 * @description Floating messenger badge / focus-retain / expand (#82)
 */
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
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

  it("no-channel muted one-liner", async () => {
    const { container } = renderFloater({ channelLabel: null });
    fireEvent.click(container.querySelector("[data-floating-chat-bubble]")!);
    // Body one-liner (div) + header select placeholder (option).
    await waitFor(() =>
      expect(
        screen.getByText(/No active channel/, { selector: "div" })
      ).toBeTruthy()
    );
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
