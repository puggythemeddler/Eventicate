"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { MessageSquare, Send, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface BookingRef {
  id: string;
  status: string;
}

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: UserInfo;
  receiver: UserInfo;
  booking: BookingRef | null;
  conversationId: string;
}

interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ProviderMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [customers] = useState<CustomerInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [sending, setSending] = useState(false);
  const [activePartner, setActivePartner] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMessages();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.user?.id || null));
  }, [fetchMessages]);

  const grouped = messages.reduce<Record<string, Message[]>>((acc, msg) => {
    const partnerId = msg.sender.id === currentUserId ? msg.receiver.id : msg.sender.id;
    const key = partnerId || msg.sender.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const partnerInfo = (partnerId: string): { name: string; initial: string; bookingRef?: string; isGroup?: boolean } => {
    const msg = messages.find(
      (m) => m.sender.id === partnerId || m.receiver.id === partnerId
    );
    if (!msg) return { name: "Unknown", initial: "?" };
    const person = msg.sender.id === partnerId ? msg.sender : msg.receiver;

    const convMsgs = messages.filter((m) => m.conversationId === msg.conversationId);
    const participants = new Set<string>();
    convMsgs.forEach((m) => { participants.add(m.sender.id); participants.add(m.receiver.id); });
    const isGroup = participants.size > 2;

    return {
      name: `${person.firstName} ${person.lastName}`,
      initial: person.firstName.charAt(0).toUpperCase(),
      bookingRef: msg.booking ? `#${msg.booking.id.slice(-6)}` : undefined,
      isGroup,
    };
  };

  const latestMessage = (msgs: Message[]) => msgs[0];

  const sendMessage = async (receiverId: string, content: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async () => {
    if (!selectedReceiver || !newMessage.trim()) return;
    await sendMessage(selectedReceiver, newMessage.trim());
    setShowNewModal(false);
    setSelectedReceiver("");
    setNewMessage("");
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-80 flex-col border-r border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h1 className="text-lg font-bold">Messages</h1>
              <Button size="sm" onClick={() => setShowNewModal(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {Object.entries(grouped).length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No messages yet.
                </div>
              ) : (
                Object.entries(grouped).map(([partnerId, msgs]) => {
                  const info = partnerInfo(partnerId);
                  const last = latestMessage(msgs);
                  return (
                    <button
                      key={partnerId}
                      onClick={() => setActivePartner(partnerId)}
                      className={`w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${
                        activePartner === partnerId ? "bg-primary-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                          {info.initial}
                          {info.isGroup && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] text-white">
                              G
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{info.name}</p>
                              {info.isGroup && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  Group
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(last.createdAt)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gray-500">
                            {last.content}
                          </p>
                          {info.bookingRef && (
                            <p className="text-xs text-primary-600">{info.bookingRef}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            {activePartner ? (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {grouped[activePartner]?.slice().reverse().map((msg) => {
                      const isMine = msg.sender.id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                              isMine
                                ? "bg-primary-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p
                              className={`mt-1 text-xs ${
                                isMine ? "text-primary-200" : "text-gray-400"
                              }`}
                            >
                              {formatDateTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-gray-200 p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        const receiver = grouped[activePartner].find(
                          (m) => m.sender.id !== currentUserId
                        );
                        if (receiver) {
                          const partnerId =
                            receiver.sender.id === currentUserId
                              ? receiver.receiver.id
                              : receiver.sender.id;
                          sendMessage(partnerId, newMessage.trim());
                        }
                      }
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle>New Message</CardTitle>
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    setSelectedReceiver("");
                    setNewMessage("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Recipient</label>
                  <select
                    value={selectedReceiver}
                    onChange={(e) => setSelectedReceiver(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select a customer...</option>
                    {customers.length === 0 && (
                      <option disabled>Loading customers...</option>
                    )}
                  </select>
                </div>
                <Textarea
                  label="Message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  placeholder="Write your message..."
                />
                <Button
                  onClick={startNewConversation}
                  disabled={!selectedReceiver || !newMessage.trim() || sending}
                  className="w-full"
                >
                  Send Message
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
