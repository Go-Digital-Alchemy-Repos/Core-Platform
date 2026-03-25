import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, ArrowLeft, User, FileText, Image as ImageIcon, Download, Phone, Mail, Shield, UserPlus, CheckCircle2 } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/shared/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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

function GuestEntryModal({
  open,
  onOpenChange,
  counselorId,
  onContinueAsGuest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counselorId: string;
  onContinueAsGuest: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-guest-entry">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-accent" />
            Contact This Counselor
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to send your message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">Create a Free Account</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
              <li>Save your conversations</li>
              <li>Receive replies directly</li>
              <li>Browse and save counselor profiles</li>
              <li>Register for events</li>
            </ul>
            <Button
              className="w-full bg-accent text-accent-foreground border-accent-border"
              onClick={() => {
                const redirect = encodeURIComponent(`/messages?counselor=${counselorId}`);
                setLocation(`/auth/register?redirectTo=${redirect}`);
              }}
              data-testid="button-register-free"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Register for Free
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Continue as Guest</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Send a one-time message with your contact information. The counselor will reply via your preferred contact method.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={onContinueAsGuest}
              data-testid="button-continue-guest"
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GuestComposeForm({ counselorId }: { counselorId: string }) {
  const { toast } = useToast();
  const [senderName, setSenderName] = useState("");
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("email");
  const [contactValue, setContactValue] = useState("");
  const [message, setMessage] = useState("");
  const [ageAcknowledged, setAgeAcknowledged] = useState(false);
  const [phiAcknowledged, setPhiAcknowledged] = useState(false);
  const [sent, setSent] = useState(false);

  const sendGuestMutation = useMutation({
    mutationFn: async (data: {
      counselorId: string;
      senderName?: string;
      contactMethod: string;
      contactValue: string;
      message: string;
      ageAcknowledged: boolean;
      phiAcknowledged: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/guest-messages", data);
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "Message sent!", description: "The counselor will contact you soon." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const canSend =
    message.trim().length > 0 &&
    contactValue.trim().length > 0 &&
    ageAcknowledged &&
    phiAcknowledged;

  const handleSend = () => {
    if (!canSend) return;
    sendGuestMutation.mutate({
      counselorId,
      senderName: senderName.trim() || undefined,
      contactMethod,
      contactValue: contactValue.trim(),
      message: message.trim(),
      ageAcknowledged: true,
      phiAcknowledged: true,
    });
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="guest-message-sent">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-heading font-semibold mb-2">Message Sent Successfully</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Your message has been delivered to the counselor. They will reach out to you
          via {contactMethod === "phone" ? "phone" : "email"} at the contact information you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4" data-testid="guest-compose-form">
      <h2 className="text-xl font-heading font-semibold mb-1">Send a Guest Message</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Fill out the form below to send a one-time message to this counselor.
      </p>

      <div className="space-y-5">
        <div>
          <Label htmlFor="guest-name" className="text-sm font-medium">Your Name (optional)</Label>
          <Input
            id="guest-name"
            placeholder="Your name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="mt-1"
            data-testid="input-guest-name"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Contact Preference</Label>
          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant={contactMethod === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => { setContactMethod("email"); setContactValue(""); }}
              className={contactMethod === "email" ? "bg-accent text-accent-foreground" : ""}
              data-testid="button-contact-email"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </Button>
            <Button
              type="button"
              variant={contactMethod === "phone" ? "default" : "outline"}
              size="sm"
              onClick={() => { setContactMethod("phone"); setContactValue(""); }}
              className={contactMethod === "phone" ? "bg-accent text-accent-foreground" : ""}
              data-testid="button-contact-phone"
            >
              <Phone className="h-4 w-4 mr-1.5" />
              Phone
            </Button>
          </div>
          <div className="mt-2">
            {contactMethod === "email" ? (
              <Input
                type="email"
                placeholder="you@example.com"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                data-testid="input-guest-contact-value"
              />
            ) : (
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                data-testid="input-guest-contact-value"
              />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="guest-message" className="text-sm font-medium">Your Message</Label>
          <Textarea
            id="guest-message"
            placeholder="Tell the counselor what you're looking for..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="mt-1"
            data-testid="textarea-guest-message"
          />
        </div>

        <div className="border rounded-md p-4 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-accent" />
            Required Acknowledgments
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="guest-age"
              checked={ageAcknowledged}
              onCheckedChange={(checked) => setAgeAcknowledged(checked === true)}
              data-testid="checkbox-guest-age"
            />
            <Label htmlFor="guest-age" className="text-sm font-normal cursor-pointer leading-normal">
              I confirm that I am 18 years of age or older
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="guest-phi"
              checked={phiAcknowledged}
              onCheckedChange={(checked) => setPhiAcknowledged(checked === true)}
              data-testid="checkbox-guest-phi"
            />
            <Label htmlFor="guest-phi" className="text-sm font-normal cursor-pointer leading-normal">
              I acknowledge that any information shared on this platform may include Protected Health Information (PHI). I understand that while TCK Wellness takes reasonable precautions, this platform is not a substitute for professional medical advice, and I consent to sharing information at my own discretion.
            </Label>
          </div>
        </div>

        <Button
          className="w-full bg-accent text-accent-foreground border-accent-border"
          disabled={!canSend || sendGuestMutation.isPending}
          onClick={handleSend}
          data-testid="button-send-guest-message"
        >
          {sendGuestMutation.isPending ? (
            <LoadingSpinner className="h-4 w-4 mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Message
        </Button>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialConvId = searchParams.get("conversation");
  const counselorParam = searchParams.get("counselor");

  const { user, isLoading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(initialConvId);
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialConvId ? "thread" : "list"
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorHandle | null>(null);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && counselorParam) {
      setShowGuestModal(true);
    }
  }, [user, authLoading, counselorParam]);

  const { data: conversations, isLoading: convsLoading } = useQuery<ConversationWithParticipants[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (counselorUserId: string) => {
      const res = await apiRequest("POST", "/api/messages/conversations", { counselorId: counselorUserId });
      return res.json();
    },
    onSuccess: (conv: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setSelectedId(conv.id);
      setMobileView("thread");
    },
  });

  const [counselorHandled, setCounselorHandled] = useState(false);

  useEffect(() => {
    if (user && counselorParam && conversations && !counselorHandled) {
      const existing = conversations.find(
        (c) => c.counselorId === counselorParam || c.clientId === counselorParam
      );
      if (existing) {
        setSelectedId(existing.id);
        setMobileView("thread");
        setCounselorHandled(true);
      } else if (!createConversationMutation.isPending) {
        setCounselorHandled(true);
        createConversationMutation.mutate(counselorParam);
      }
    }
  }, [user, counselorParam, conversations, counselorHandled]);

  const selectedConv = conversations?.find((c) => c.id === selectedId);

  const { data: threadData, isLoading: threadLoading } = useQuery<{
    conversation: ConversationWithParticipants;
    messages: MessageWithSender[];
  }>({
    queryKey: ["/api/messages/conversations", selectedId],
    enabled: !!selectedId && !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      content: string;
      contentHtml?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
    }) => {
      const { id, ...body } = payload;
      const res = await apiRequest("POST", `/api/messages/conversations/${id}/send`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
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
    if (selectedId && user) {
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

  const handleSend = (data: {
    content: string;
    contentHtml: string;
    attachment?: { url: string; name: string; type: string; size: number };
  }) => {
    if (!selectedId) return;
    sendMutation.mutate({
      id: selectedId,
      content: data.content,
      contentHtml: data.contentHtml,
      attachmentUrl: data.attachment?.url,
      attachmentName: data.attachment?.name,
      attachmentType: data.attachment?.type,
    });
  };

  const messages = threadData?.messages ?? [];

  if (authLoading) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex justify-center py-16">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (!user && counselorParam) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-messages-heading">
            Contact Counselor
          </h1>

          <GuestEntryModal
            open={showGuestModal}
            onOpenChange={setShowGuestModal}
            counselorId={counselorParam}
            onContinueAsGuest={() => {
              setShowGuestModal(false);
              setGuestMode(true);
            }}
          />

          {guestMode && <GuestComposeForm counselorId={counselorParam} />}

          {!guestMode && !showGuestModal && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p className="text-sm">Choose how you'd like to contact this counselor</p>
              <Button
                variant="outline"
                onClick={() => setShowGuestModal(true)}
                data-testid="button-reopen-modal"
              >
                Show Options
              </Button>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-messages-heading">
            Messages
          </h1>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="text-sm">Please sign in to view your messages</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-messages-heading">
          Messages
        </h1>

        <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          <div className="flex h-full">
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
                                  ? `You: ${conv.lastMessage.content.replace(/<[^>]*>/g, "")}`
                                  : conv.lastMessage.content.replace(/<[^>]*>/g, "")
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
                        const hasAttachment = !!(msg as any).attachmentUrl;
                        const attachmentUrl = (msg as any).attachmentUrl as string | null;
                        const attachmentName = (msg as any).attachmentName as string | null;
                        const attachmentType = (msg as any).attachmentType as string | null;
                        const isImageAttachment = attachmentType?.startsWith("image/");
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
                                {(msg as any).contentHtml ? (
                                  <div
                                    className="tiptap-output [&_a]:underline [&_a]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: (msg as any).contentHtml }}
                                  />
                                ) : (
                                  msg.content
                                )}
                              </div>
                              {hasAttachment && attachmentUrl && (
                                <div className={`mt-1 ${isMe ? "self-end" : "self-start"}`}>
                                  {isImageAttachment ? (
                                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={attachmentUrl}
                                        alt={attachmentName ?? "attachment"}
                                        className="max-w-[240px] max-h-[180px] rounded-lg border object-cover"
                                        data-testid={`img-attachment-${msg.id}`}
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm"
                                      data-testid={`link-attachment-${msg.id}`}
                                    >
                                      <FileText className="w-4 h-4 text-muted-foreground" />
                                      <span className="truncate max-w-[180px]">{attachmentName ?? "File"}</span>
                                      <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    </a>
                                  )}
                                </div>
                              )}
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

                  <div className="border-t px-4 py-3 bg-background">
                    <div className="flex gap-2 items-end">
                      <RichTextEditor
                        onSend={handleSend}
                        disabled={sendMutation.isPending}
                        placeholder="Type a message… (Enter to send)"
                        sendRef={editorRef}
                      />
                      <Button
                        onClick={() => editorRef.current?.triggerSend()}
                        disabled={sendMutation.isPending}
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
