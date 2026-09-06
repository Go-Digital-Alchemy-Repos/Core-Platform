import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { ManualCrmCustomFields, type ManualFieldsState } from "./crm-record-custom-fields";
export function CreateCrmClientSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customFields, setCustomFields] = useState<ManualFieldsState>({ ready: false, values: [] });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !customFields.ready)
        throw new Error("Complete the client and custom fields before saving.");
      const response = await apiRequest("POST", "/api/admin/crm/clients", {
        name: name.trim(),
        primaryEmail: email.trim() || null,
        customFields: customFields.values,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/clients"] });
      onClose();
    },
  });
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        size="lg"
        className="max-sm:!animate-none left-0 right-auto h-[100dvh] w-[100dvw] max-w-[100dvw] overflow-hidden sm:left-auto sm:right-0 sm:w-full"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle>Create client</SheetTitle>
          <SheetDescription>Create the client profile and custom values together.</SheetDescription>
        </SheetHeader>
        <SheetBody className="min-h-0 space-y-4">
          <fieldset disabled={mutation.isPending} className="space-y-3">
            <Label htmlFor="new-client-name">Name</Label>
            <Input id="new-client-name" value={name} onChange={(e) => setName(e.target.value)} />
            <Label htmlFor="new-client-email">Email</Label>
            <Input
              id="new-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <ManualCrmCustomFields
              scope="client"
              onChange={setCustomFields}
              disabled={mutation.isPending}
            />
          </fieldset>
          {mutation.isError && (
            <p role="alert">Creation failed. Your entries are retained. {mutation.error.message}</p>
          )}
        </SheetBody>
        <SheetFooter className="shrink-0">
          <Button
            disabled={!name.trim() || !customFields.ready || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Create client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
