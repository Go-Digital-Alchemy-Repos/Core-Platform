import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Mail, MailOpen } from "lucide-react";
import type { ContactMessage } from "@shared/schema";

export default function AdminMessagesPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AdminSidebar>
        <MessagesContent />
      </AdminSidebar>
    </ProtectedRoute>
  );
}

function MessagesContent() {
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "Message marked as read" });
    },
  });

  function openMessage(msg: ContactMessage) {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      markReadMutation.mutate(msg.id);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-heading font-semibold mb-6" data-testid="text-admin-messages-title">
        Messages
      </h1>

      <div className="space-y-3">
        {messages?.map((msg) => (
          <Card
            key={msg.id}
            className="cursor-pointer hover-elevate"
            onClick={() => openMessage(msg)}
            data-testid={`card-message-${msg.id}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                {msg.isRead ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="h-4 w-4 text-primary" />
                )}
                <CardTitle className={`text-base ${msg.isRead ? "" : "font-bold"}`} data-testid={`text-message-subject-${msg.id}`}>
                  {msg.subject}
                </CardTitle>
                {!msg.isRead && (
                  <Badge variant="default" data-testid={`badge-unread-${msg.id}`}>
                    New
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground" data-testid={`text-message-date-${msg.id}`}>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : "—"}
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid={`text-message-from-${msg.id}`}>
                From: {msg.name} ({msg.email})
              </p>
            </CardContent>
          </Card>
        ))}
        {(!messages || messages.length === 0) && (
          <p className="text-center text-muted-foreground py-8">No messages found.</p>
        )}
      </div>

      <Sheet open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <SheetContent side="right" size="default">
          <SheetHeader>
            <SheetTitle data-testid="text-message-dialog-subject">
              {selectedMessage?.subject}
            </SheetTitle>
            <SheetDescription className="sr-only">View message details</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">From: </span>
                <span data-testid="text-message-dialog-from">
                  {selectedMessage?.name} ({selectedMessage?.email})
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Date: </span>
                <span data-testid="text-message-dialog-date">
                  {selectedMessage?.createdAt
                    ? new Date(selectedMessage.createdAt).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm whitespace-pre-wrap" data-testid="text-message-dialog-body">
                  {selectedMessage?.message}
                </p>
              </div>
              {selectedMessage && !selectedMessage.isRead && (
                <Button
                  onClick={() => markReadMutation.mutate(selectedMessage.id)}
                  disabled={markReadMutation.isPending}
                  data-testid="button-mark-read"
                >
                  Mark as Read
                </Button>
              )}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
