import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventOrganizer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CmsImageUpload } from "../cms/components/cms-image-upload";

const queryKey = ["/api/admin/events/organizers"];
const empty = { name: "", description: "", imageUrl: "", email: "", phone: "", websiteUrl: "" };

export function SpeakersSettings() {
  const cache = useQueryClient();
  const speakers = useQuery<EventOrganizer[]>({ queryKey });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState(empty);
  const [deleting, setDeleting] = useState<EventOrganizer | null>(null);
  const save = useMutation({
    mutationFn: () =>
      apiRequest(
        editingId ? "PUT" : "POST",
        `/api/admin/events/organizers${editingId ? `/${editingId}` : ""}`,
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])),
      ),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey });
      setOpen(false);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/events/organizers/${id}`),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey });
      void cache.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setDeleting(null);
    },
  });
  function edit(speaker?: EventOrganizer) {
    setEditingId(speaker?.id ?? null);
    setValues(
      speaker
        ? {
            name: speaker.name,
            description: speaker.description ?? "",
            imageUrl: speaker.imageUrl ?? "",
            email: speaker.email ?? "",
            phone: speaker.phone ?? "",
            websiteUrl: speaker.websiteUrl ?? "",
          }
        : empty,
    );
    save.reset();
    setOpen(true);
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Speakers</CardTitle>
        <Button onClick={() => edit()}>Add speaker</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Save speakers and hosts to reuse in events. Existing events keep their own speaker details
          when a saved speaker changes.
        </p>
        {speakers.isLoading && <p role="status">Loading speakers…</p>}
        {speakers.isError && (
          <p role="alert">
            Unable to load speakers.{" "}
            <Button variant="ghost" onClick={() => void speakers.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {speakers.data?.length === 0 && <p>No saved speakers yet.</p>}
        <ul className="divide-y">
          {[...(speakers.data ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((speaker) => (
              <li
                key={speaker.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="min-w-0 break-words font-medium">{speaker.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    aria-label={`Edit ${speaker.name}`}
                    onClick={() => edit(speaker)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    aria-label={`Delete ${speaker.name}`}
                    onClick={() => {
                      remove.reset();
                      setDeleting(speaker);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      </CardContent>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!save.isPending) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit speaker" : "Add speaker"}</DialogTitle>
            <DialogDescription>
              Save a reusable speaker profile for future events.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="speaker-name">Name</Label>
              <Input
                id="speaker-name"
                required
                maxLength={200}
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speaker-bio">Biography</Label>
              <Textarea
                id="speaker-bio"
                maxLength={20000}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Speaker image</Label>
              <CmsImageUpload
                value={values.imageUrl}
                onChange={(imageUrl) => setValues((current) => ({ ...current, imageUrl }))}
              />
            </div>
            {(
              [
                ["email", "Email", "email"],
                ["phone", "Phone", "tel"],
                ["websiteUrl", "Website", "url"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`speaker-${key}`}>{label} (optional)</Label>
                <Input
                  id={`speaker-${key}`}
                  type={type}
                  maxLength={key === "websiteUrl" ? 2048 : 320}
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                />
              </div>
            ))}
            {save.error && (
              <p role="alert" className="text-sm text-destructive">
                {save.error.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={save.isPending || !values.name.trim()} type="submit">
                {save.isPending ? "Saving…" : "Save speaker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(next) => {
          if (!next && !remove.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved speaker. Existing events retain their speaker name, biography,
              and image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && <p role="alert">{remove.error.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete speaker"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
