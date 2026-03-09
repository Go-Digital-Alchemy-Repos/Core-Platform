import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, ArrowLeft, User } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConversationWithParticipants, MessageWithSender } from "@/../../server/storage/message.storage";

function formatTime(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";
}

function getOtherParticipant(
  conv: ConversationWithParticipants,
  userId: string
) {
  return userId === conv.clientId ? conv.counselor : conv.client;
}

export default function MessagesPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const initialConvId = searchParams.get("conversation");

  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(initialConvId);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialConvId ? "thread" : "list"
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<ConversationWithParticipants[]>({
    queryKey: ["/api/messages/conversations"],
  });

  const selectedConv = conversations?.find((c) => c.id === selectedId);

  const { data: threadData, isLoading: threadLoading } = useQuery<{
    conversation: ConversationWithParticipants;
    messages: MessageWithSender[];
  }>({
    queryKey: ["/api/messages/conversations", selectedId],
    enabled: !!selectedId,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiRequest("POST", `/api/messages/conversations/${id}/send`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setDraft("");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/messages/conversations/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  useEffect(() => {
    if (selectedId) {
      markReadMutation.mutate(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData?.messages]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView("thread");
  };

  const handleSend = () => {
    if (!selectedId || !draft.trim()) return;
    sendMutation.mutate({ id: selectedId, content: draft.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = threadData?.messages ?? [];

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-messages-heading">
          Messages
        </h1>

        <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          <div className="flex h-full">
            {/* Conversation list — hidden on mobile when thread is open */}
            <div
              className={`flex flex-col border-r bg-background ${
                mobileView === "thread" ? "hidden sm:flex" : "flex"
              } w-full sm:w-80 lg:w-96 flex-shrink-0`}
            >
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium text-muted-foreground">
                  {conversations?.length ?? 0} conversation{conversations?.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {convsLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : !conversations?.length ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No conversations yet</p>
                    <p className="text-xs mt-1 opacity-70">Browse the directory to contact a counselor</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const other = getOtherParticipant(conv, user!.id);
                    const isSelected = conv.id === selectedId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                          isSelected ? "bg-accent/8 border-l-2 border-l-accent" : ""
                        }`}
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0 mt-0.5">
                          <AvatarImage src={other.profileImageUrl ?? undefined} />
                          <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                            {getInitials(other.firstName, other.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate">
                              {other.firstName} {other.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(conv.updatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage
                                ? conv.lastMessage.senderId === user!.id
                                  ? `You: ${conv.lastMessage.content}`
                                  : conv.lastMessage.content
                                : "No messages yet"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-accent text-accent-foreground text-xs h-5 min-w-5 flex items-center justify-center flex-shrink-0 px-1.5">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Thread panel */}
            <div
              className={`flex flex-col flex-1 min-w-0 ${
                mobileView === "list" ? "hidden sm:flex" : "flex"
              }`}
            >
              {!selectedId || !selectedConv ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <MessageSquare className="h-12 w-12 opacity-20" />
                  <p className="text-sm">Select a conversation to read messages</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="sm:hidden"
                      onClick={() => setMobileView("list")}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {(() => {
                      const other = getOtherParticipant(selectedConv, user!.id);
                      return (
                        <>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={other.profileImageUrl ?? undefined} />
                            <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                              {getInitials(other.firstName, other.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{other.firstName} {other.lastName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {other.role === "therapist" ? "Counselor" : other.role}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {threadLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
                        <MessageSquare className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user!.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                            data-testid={`message-${msg.id}`}
                          >
                            {!isMe && (
                              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                                <AvatarImage src={msg.sender.profileImageUrl ?? undefined} />
                                <AvatarFallback className="bg-accent/10 text-accent text-xs font-semibold">
                                  {getInitials(msg.sender.firstName, msg.sender.lastName)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  isMe
                                    ? "bg-accent text-accent-foreground rounded-br-sm"
                                    : "bg-muted rounded-bl-sm"
                                }`}
                              >
                                {msg.content}
                              </div>
                              <span className="text-[10px] text-muted-foreground px-1">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send input */}
                  <div className="border-t px-4 py-3 bg-background">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message… (Enter to send)"
                        className="min-h-[40px] max-h-32 resize-none flex-1"
                        data-testid="input-message-draft"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!draft.trim() || sendMutation.isPending}
                        className="bg-accent text-accent-foreground border-accent-border flex-shrink-0"
                        size="icon"
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
