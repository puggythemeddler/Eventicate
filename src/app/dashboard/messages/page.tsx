"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import {
  MessageSquare, Send, Plus, Paperclip, X, MessageCircle, FileText,
} from "lucide-react";
import { formatDateTime, formatTime } from "@/lib/utils";

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
}

interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  createdAt: string;
  sender: UserInfo;
  receiver: UserInfo;
  conversationId: string;
  waStatus?: string;
  waError?: string | null;
}

interface Conversation {
  id: string;
  bookingId: string | null;
  masterQuoteId: string | null;
  unreadCount: number;
  participants: UserInfo[];
  participantCount: number;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    fileUrl?: string | null;
    createdAt: string;
    senderId: string;
  } | null;
}

interface Provider {
  id: string;
  businessName: string;
}

function whatsappLink(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen"><Sidebar role="CUSTOMER" /><div className="flex-1 p-8 text-sm text-charcoal-500">Loading...</div></div>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        return data.conversations || [];
      }
    } catch {
      setError("Failed to load conversations");
    }
    return [];
  }, []);

  const fetchThread = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch {
      setError("Failed to load messages");
    }
  }, []);

  const refresh = useCallback(async () => {
    const convs = await fetchConversations();
    if (activeConv) {
      const updated = convs.find((c: Conversation) => c.id === activeConv.id);
      if (updated && updated.unreadCount === 0) {
        // Conversation open; refresh its thread so new messages appear.
      }
      setActiveConv((prev) => {
        if (!prev) return prev;
        const match = convs.find((c: Conversation) => c.id === prev.id);
        return match || prev;
      });
      await fetchThread(activeConv.id);
    }
  }, [activeConv, fetchConversations, fetchThread]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionRes = await fetch("/api/auth/session");
      const { user } = await sessionRes.json();
      if (!cancelled) setCurrentUserId(user?.id || null);

      const [providersRes] = await Promise.all([fetch("/api/bookings")]);
      const data = await providersRes.json();
      const unique = new Map<string, Provider>();
      (data.bookings || []).forEach((b: { provider: Provider }) => {
        if (b.provider) unique.set(b.provider.id, b.provider);
      });
      if (!cancelled) setProviders(Array.from(unique.values()));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll for new messages every 5 seconds.
  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // Auto-scroll to the latest message when a conversation opens or a message
  // arrives while the user is near the bottom (so history reading isn't yanked).
  const nearBottomRef = useRef(true);
  const prevConvRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevConvRef.current !== activeConv?.id) {
      prevConvRef.current = activeConv?.id || null;
      nearBottomRef.current = true;
    }
    if (nearBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, activeConv?.id]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const openConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConv(conv);
      await fetchThread(conv.id);
      // Mark read locally + clear badge.
      fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conv.id }),
      }).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    },
    [fetchThread]
  );

  const sendMessage = async (receiverId: string, content: string, opts?: { type?: string; fileUrl?: string }) => {
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          content,
          bookingId: bookingId || activeConv?.bookingId || undefined,
          conversationId: activeConv?.id,
          type: opts?.type || "TEXT",
          fileUrl: opts?.fileUrl,
        }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchThread(activeConv?.id || "");
        await fetchConversations();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message");
      }
    } catch {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeConv || !newMessage.trim()) return;
    const recipient = activeConv.participants.find((p) => p.id !== currentUserId) || activeConv.participants[0];
    if (!recipient) return;
    sendMessage(recipient.id, newMessage.trim());
  };

  const handleFile = async (file: File) => {
    if (!activeConv) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload?type=messages", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const recipient = activeConv.participants.find((p) => p.id !== currentUserId) || activeConv.participants[0];
      if (!recipient) return;
      await sendMessage(recipient.id, file.name, { type: "FILE", fileUrl: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startNewConversation = async () => {
    if (!selectedReceiver || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedReceiver,
          content: newMessage.trim(),
          bookingId: bookingId || undefined,
        }),
      });
      if (res.ok) {
        setShowNewModal(false);
        setSelectedReceiver("");
        setNewMessage("");
        await fetchConversations();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message");
      }
    } finally {
      setSending(false);
    }
  };

  const displayName = (u?: UserInfo | null) =>
    u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown";

  const filteredConvs = conversations.filter((c) =>
    c.participants.some((p) => displayName(p).toLowerCase().includes(search.toLowerCase()))
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderAttachment = (msg: Message) => {
    if (!msg.fileUrl) return null;
    const isImage = /\.(jpe?g|png|webp|gif)$/i.test(msg.fileUrl);
    return (
      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={msg.fileUrl} alt={msg.content} className="max-h-48 rounded-lg" />
        ) : (
          <span className="flex items-center gap-2 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-xs dark:border-charcoal-700 dark:bg-charcoal-900">
            <FileText className="h-4 w-4 text-primary-600" />
            <span className="truncate">{msg.content || "Attachment"}</span>
          </span>
        )}
      </a>
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <TopBar />
        {error && (
          <div className="flex items-center justify-between border-b border-terracotta-200 bg-terracotta-50 px-4 py-2 text-sm text-terracotta-700 dark:border-terracotta-800 dark:bg-terracotta-900/30 dark:text-terracotta-400">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setError("")} className="text-terracotta-400 hover:text-terracotta-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-80 flex-col border-r border-charcoal-200 dark:border-charcoal-800">
            <div className="border-b border-charcoal-200 p-4 dark:border-charcoal-800">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">Messages</h1>
                <Button size="sm" onClick={() => setShowNewModal(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </Button>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="mt-3"
                aria-label="Search conversations"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="p-4 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                  {search ? "No matching conversations." : "No messages yet. Start a conversation with a provider."}
                </div>
              ) : (
                filteredConvs.map((conv) => {
                  const partner = conv.participants[0];
                  const initial = (partner?.firstName || "?").charAt(0).toUpperCase();
                  const isGroup = conv.participantCount > 1;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      className={`flex w-full items-start gap-3 border-b border-charcoal-100 p-4 text-left transition-colors hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800/50 ${
                        activeConv?.id === conv.id ? "bg-primary-50 dark:bg-primary-900/20" : ""
                      }`}
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        {initial}
                        {isGroup && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] text-white">
                            G
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {isGroup
                              ? `${displayName(partner)} +${conv.participantCount}`
                              : displayName(partner)}
                          </p>
                          {conv.lastMessage && (
                            <span className="shrink-0 text-xs text-charcoal-400 dark:text-charcoal-500">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-charcoal-500 dark:text-charcoal-400">
                            {conv.lastMessage?.content || "No messages"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-bold text-white">
                              {conv.unreadCount}
                            </span>
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
            {activeConv ? (
              <>
                <div className="flex items-center justify-between border-b border-charcoal-200 px-4 py-3 dark:border-charcoal-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {(activeConv.participants[0]?.firstName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {activeConv.participantCount > 1
                          ? `${activeConv.participants.map((p) => p.firstName).join(", ")}`
                          : displayName(activeConv.participants[0])}
                      </p>
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                        {activeConv.participantCount > 1
                          ? `${activeConv.participantCount + 1} participants`
                          : "Booking conversation"}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const partner = activeConv.participants[0];
                    const wa = whatsappLink(partner?.phone, `Hello ${partner?.firstName}, we're chatting about our Eventicate booking.`);
                    return wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    ) : null;
                  })()}
                </div>

                <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="py-10 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                        No messages yet — say hello!
                      </p>
                    )}
                    {messages.map((msg, i) => {
                      const isMine = msg.sender.id === currentUserId;
                      const showDate =
                        i === 0 ||
                        new Date(messages[i - 1].createdAt).toDateString() !==
                          new Date(msg.createdAt).toDateString();
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="my-3 text-center">
                              <span className="rounded-full bg-sand px-3 py-1 text-[11px] text-charcoal-500 dark:bg-charcoal-800 dark:text-charcoal-400">
                                {new Date(msg.createdAt).toLocaleDateString(undefined, {
                                  weekday: "short", month: "short", day: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                                isMine
                                  ? "bg-primary-600 text-white"
                                  : "bg-sand text-charcoal-900 dark:bg-charcoal-800 dark:text-charcoal-100"
                              }`}
                            >
                              {msg.type === "FILE" ? renderAttachment(msg) : <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                              <p className={`mt-1 flex items-center gap-1 text-[11px] ${isMine ? "text-primary-200" : "text-charcoal-400 dark:text-charcoal-500"}`}>
                                {msg.waStatus === "SENT" && (
                                  <MessageCircle className="h-3 w-3" aria-label="Delivered via WhatsApp" />
                                )}
                                {msg.waStatus === "FAILED" && (
                                  <span className="text-terracotta-400" title={msg.waError || "WhatsApp delivery failed"}>
                                    (WhatsApp failed)
                                  </span>
                                )}
                                {formatDateTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-charcoal-200 p-4 dark:border-charcoal-800">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label="Attach file"
                    >
                      {uploading ? (
                        <span className="flex h-4 w-4 animate-spin items-center justify-center rounded-full border-2 border-charcoal-300 border-t-primary-600" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message... (Enter to send)"
                      className="flex-1"
                      aria-label="Message"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="mt-1.5 pl-1 text-[11px] text-charcoal-400 dark:text-charcoal-500">
                    {totalUnread > 0 ? `${totalUnread} unread` : ""}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-charcoal-300 dark:text-charcoal-600" />
                  <p className="text-charcoal-500 dark:text-charcoal-400">Select a conversation</p>
                  <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-500">
                    Or start one with a provider you&apos;ve booked
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showNewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-message-title"
          >
            <Card className="w-full max-w-md">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle><span id="new-message-title">New Message</span></CardTitle>
                <button
                  type="button"
                  aria-label="Close new message dialog"
                  onClick={() => {
                    setShowNewModal(false);
                    setSelectedReceiver("");
                    setNewMessage("");
                  }}
                  className="text-charcoal-400 transition-colors hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <Select
                  label="Recipient"
                  value={selectedReceiver}
                  onChange={(e) => setSelectedReceiver(e.target.value)}
                  options={[
                    { value: "", label: "Select a provider..." },
                    ...providers.map((p) => ({
                      value: p.id,
                      label: p.businessName,
                    })),
                  ]}
                />
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