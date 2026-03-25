import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Phone, User, Clock, Eye, Trash2, MessageSquare } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GuestMessage } from "@shared/schema";

function formatDate(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GuestMessagesPage() {
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery<GuestMessage[]>({
    queryKey: ["/api/guest-messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/guest-messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/guest-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-messages"] });
      toast({ title: "Message deleted" });
    },
  });

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-guest-messages-heading">
              Guest Messages
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Messages from visitors who haven't created an account
            </p>
          </div>
          {messages && messages.filter((m) => !m.isRead).length > 0 && (
            <Badge className="bg-accent text-accent-foreground" data-testid="badge-unread-count">
              {messages.filter((m) => !m.isRead).length} unread
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">No guest messages yet</p>
            <p className="text-xs opacity-70">
              When visitors send you messages without an account, they'll appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card
                key={msg.id}
                className={`transition-colors ${!msg.isRead ? "border-accent/40 bg-accent/5" : ""}`}
                data-testid={`guest-message-${msg.id}`}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-guest-name-${msg.id}`}>
                          {msg.senderName || "Anonymous Guest"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {msg.contactMethod === "email" ? (
                            <Mail className="h-3 w-3" />
                          ) : (
                            <Phone className="h-3 w-3" />
                          )}
                          <span data-testid={`text-guest-contact-${msg.id}`}>{msg.contactValue}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!msg.isRead && (
                        <Badge variant="outline" className="text-xs border-accent text-accent">
                          New
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-guest-message-${msg.id}`}>
                      {msg.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {msg.contactMethod === "email" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-reply-${msg.id}`}
                        >
                          <a href={`mailto:${msg.contactValue}`}>
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                            Reply via Email
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`button-reply-${msg.id}`}
                        >
                          <a href={`tel:${msg.contactValue}`}>
                            <Phone className="h-3.5 w-3.5 mr-1.5" />
                            Call
                          </a>
                        </Button>
                      )}
                      {!msg.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate(msg.id)}
                          disabled={markReadMutation.isPending}
                          data-testid={`button-mark-read-${msg.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Mark Read
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(msg.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${msg.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
