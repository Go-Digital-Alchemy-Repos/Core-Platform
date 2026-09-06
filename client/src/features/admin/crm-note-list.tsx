type Note = {
  id: string;
  body: string;
  createdAt: string | Date | null;
  authorName?: string | null;
};
export function CrmNoteVisibility() {
  return <p className="text-sm text-muted-foreground">Visible to everyone with CRM access.</p>;
}
export function CrmNoteList({
  notes,
  formatDate,
}: {
  notes: Note[];
  formatDate: (value: string | Date | null) => string;
}) {
  return (
    <div className="space-y-2">
      {notes.map((item) => (
        <div key={item.id} className="rounded-md border p-3 text-sm">
          <p className="whitespace-pre-wrap break-words">{item.body}</p>
          <p className="mt-2 break-words text-xs text-muted-foreground">
            {item.authorName?.trim() || "Author unavailable"} · {formatDate(item.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
