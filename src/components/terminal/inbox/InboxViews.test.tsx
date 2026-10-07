// @vitest-environment jsdom
/**
 * @file InboxViews.test.tsx
 * @description Shared inbox list/thread extract helpers (#82)
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import {
  ChannelSwitcher,
  InboxThreadList,
  InboxThreadMessages,
  NewConversationForm,
  shortAddr,
  type InboxThreadView
} from "./InboxViews";
import type { Address } from "viem";
import { channelId } from "../chatChannels";

const theme = THEMES.matrix;
const peer = "0x1111111111111111111111111111111111111111" as Address;
const self = "0x2222222222222222222222222222222222222222" as Address;

const SEPOLIA_CHANNEL = {
  chainId: 11155111,
  address: "0x6248F070A2f849ee1410BC35aa86A0e0F08e96a5",
  name: "lobby"
} as const;
const ACTIVE_ID = channelId(SEPOLIA_CHANNEL.chainId, SEPOLIA_CHANNEL.address);

describe("shortAddr", () => {
  it("abbreviates long addresses", () => {
    expect(shortAddr(peer)).toBe("0x1111…1111");
  });
  it("passes through short strings", () => {
    expect(shortAddr("0xabc")).toBe("0xabc");
  });
});

describe("InboxThreadList", () => {
  it("renders empty label when no senders", () => {
    render(
      <InboxThreadList
        theme={theme}
        senders={[]}
        onOpenThread={() => {}}
        emptyLabel="No conversations"
      />
    );
    expect(screen.getByText("No conversations")).toBeTruthy();
  });

  it("opens a thread on row click", () => {
    const onOpen = vi.fn();
    render(
      <InboxThreadList
        theme={theme}
        senders={[{ peer, count: 2, label: "alice" }]}
        onOpenThread={onOpen}
      />
    );
    fireEvent.click(screen.getByText("alice"));
    expect(onOpen).toHaveBeenCalledWith(peer);
  });
});

describe("InboxThreadMessages", () => {
  const thread: InboxThreadView = {
    peer,
    self,
    peerLabel: "bob",
    messages: [
      {
        from: peer,
        timestamp: 1_700_000_000,
        iv: "0x00",
        ciphertext: "0x01",
        decrypted: "hello"
      }
    ]
  };

  it("renders decrypted message and back control", () => {
    const onBack = vi.fn();
    render(
      <InboxThreadMessages theme={theme} thread={thread} onBack={onBack} />
    );
    expect(screen.getByText("hello")).toBeTruthy();
    fireEvent.click(screen.getByText("‹ threads"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows cannot-decrypt fallback", () => {
    const t: InboxThreadView = {
      ...thread,
      messages: [
        {
          from: peer,
          timestamp: 1_700_000_000,
          iv: "0x00",
          ciphertext: "0x01",
          decryptFailed: true
        }
      ]
    };
    render(<InboxThreadMessages theme={theme} thread={t} />);
    expect(screen.getByText("[cannot decrypt — wrong key]")).toBeTruthy();
  });

  it("invokes onSend from composer", async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <InboxThreadMessages theme={theme} thread={thread} onSend={onSend} />
    );
    const input = screen.getByLabelText("Message") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "yo" } });
    fireEvent.click(screen.getByLabelText("Send"));
    expect(onSend).toHaveBeenCalledWith("yo");
  });
});

describe("ChannelSwitcher", () => {
  it("renders active channel in a dropdown", () => {
    render(
      <ChannelSwitcher
        theme={theme}
        channels={[SEPOLIA_CHANNEL]}
        activeId={ACTIVE_ID}
        onSwitch={() => {}}
      />
    );
    const sel = screen.getByLabelText("Chat channel") as HTMLSelectElement;
    expect(sel).toBeTruthy();
    expect(sel.value).toBe(ACTIVE_ID);
    expect(sel.options.length).toBe(1);
  });

  it("fires onSwitch when a channel is picked", () => {
    const onSwitch = vi.fn();
    render(
      <ChannelSwitcher
        theme={theme}
        channels={[SEPOLIA_CHANNEL]}
        activeId={null}
        onSwitch={onSwitch}
      />
    );
    fireEvent.change(screen.getByLabelText("Chat channel"), {
      target: { value: ACTIVE_ID }
    });
    expect(onSwitch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "lobby", chainId: 11155111 })
    );
  });
});

describe("NewConversationForm (#140 A2)", () => {
  it("renders NEW, peer, message, and SEND when open", () => {
    render(
      <NewConversationForm
        theme={theme}
        onStart={vi.fn()}
        defaultOpen
      />
    );
    expect(screen.getByTestId("new-conversation-form")).toBeTruthy();
    expect(screen.getByTestId("new-conversation-toggle").textContent).toMatch(/NEW/i);
    expect(screen.getByTestId("new-conversation-peer")).toBeTruthy();
    expect(screen.getByPlaceholderText("0x… or ENS")).toBeTruthy();
    expect(screen.getByTestId("new-conversation-message")).toBeTruthy();
    expect(screen.getByTestId("new-conversation-send").textContent).toMatch(/SEND/i);
    expect(screen.queryByTestId("new-conversation-cli-hint")).toBeNull();
  });

  it("starts collapsed when defaultOpen is false", () => {
    render(
      <NewConversationForm
        theme={theme}
        onStart={vi.fn()}
        defaultOpen={false}
      />
    );
    expect(screen.getByTestId("new-conversation-toggle")).toBeTruthy();
    expect(screen.queryByTestId("new-conversation-peer")).toBeNull();
  });

  it("calls onStart with peer + message and clears fields", async () => {
    const onStart = vi.fn().mockResolvedValue(peer);
    render(
      <NewConversationForm theme={theme} onStart={onStart} defaultOpen />
    );
    fireEvent.change(screen.getByTestId("new-conversation-peer"), {
      target: { value: peer }
    });
    fireEvent.change(screen.getByTestId("new-conversation-message"), {
      target: { value: "hello" }
    });
    fireEvent.click(screen.getByTestId("new-conversation-send"));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith(peer, "hello"));
  });
});
