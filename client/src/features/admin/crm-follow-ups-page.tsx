import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CrmAssigneePage, CrmFollowUpItem, CrmFollowUpPage } from "@shared/crm-follow-ups";
const endpoint = "/api/admin/crm/follow-ups";
function TaskRow({
  item,
  assignees,
}: {
  item: CrmFollowUpItem;
  assignees: CrmAssigneePage["items"];
}) {
  const [assigned, setAssigned] = useState<string | null | undefined>();
  const [assignedName, setAssignedName] = useState("");
  const [completed, setCompleted] = useState<boolean | undefined>();
  const mutation = useMutation({
    mutationFn: async () => {
      const path =
        item.kind === "lead"
          ? `/api/admin/crm/tasks/${item.taskId}`
          : `/api/admin/crm/clients/tasks/${item.taskId}`;
      await apiRequest("PATCH", path, {
        ...(assigned !== undefined ? { assignedToId: assigned } : {}),
        ...(completed !== undefined ? { completed } : {}),
      });
    },
    onSuccess: () => {
      setAssigned(undefined);
      setCompleted(undefined);
      void queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
  });
  let options =
    assignees.some((x) => x.id === item.assignedToId) || !item.assignee
      ? assignees
      : [
          {
            id: item.assignee.id,
            name: item.assignee.name + (item.assignee.eligible ? "" : " (unavailable)"),
          },
          ...assignees,
        ];
  if (assigned && !options.some((option) => option.id === assigned))
    options = [{ id: assigned, name: assignedName }, ...options];
  const recordUrl = `/admin/crm${item.kind === "client" ? "/clients" : ""}?record=${encodeURIComponent(item.recordId)}`;
  return (
    <article aria-label={item.title} className="rounded-lg border p-4 space-y-3">
      <div>
        <h2 className="font-semibold">{item.title}</h2>
        <Link className="text-primary underline" href={recordUrl}>
          {item.recordName} ({item.kind})
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {item.dueAt
          ? `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(item.dueAt))} UTC`
          : "No due date"}
      </p>
      <fieldset disabled={mutation.isPending} className="min-w-0 flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          Assignee
          <select
            aria-label="Assignee"
            className="max-w-full rounded border bg-background p-2"
            value={assigned !== undefined ? (assigned ?? "") : (item.assignedToId ?? "")}
            onChange={(e) => {
              setAssigned(e.target.value || null);
              setAssignedName(e.target.selectedOptions[0]?.textContent ?? "Selected account");
            }}
          >
            <option value="">Unassigned</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={completed ?? item.completed}
            onChange={(e) => setCompleted(e.target.checked)}
          />
          Completed
        </label>
        <Button
          disabled={assigned === undefined && completed === undefined}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Save task"}
        </Button>
      </fieldset>
      {mutation.isError ? (
        <p role="alert">
          {mutation.error.message ||
            "Task could not be saved. Your changes are kept; retry Save task."}
        </p>
      ) : null}
    </article>
  );
}
export default function CrmFollowUpsPage() {
  const [kind, setKind] = useState("all"),
    [completion, setCompletion] = useState("open"),
    [due, setDue] = useState("all"),
    [owner, setOwner] = useState("all"),
    [assigneeId, setAssigneeId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeCursor, setAssigneeCursor] = useState<string | null>(null);
  const params = new URLSearchParams({ kind, completion, due, owner, limit: "25" });
  if (owner === "user") params.set("assigneeId", assigneeId);
  if (cursor) params.set("cursor", cursor);
  const worklist = useQuery<CrmFollowUpPage>({
    queryKey: [endpoint, params.toString()],
    queryFn: async () => (await apiRequest("GET", `${endpoint}?${params}`)).json(),
    enabled: owner !== "user" || Boolean(assigneeId),
  });
  const assigneeParams = new URLSearchParams({ query: assigneeQuery, limit: "25" });
  if (assigneeCursor) assigneeParams.set("cursor", assigneeCursor);
  const assignees = useQuery<CrmAssigneePage>({
    queryKey: [endpoint, "assignees", assigneeParams.toString()],
    queryFn: async () =>
      (await apiRequest("GET", `${endpoint}/assignees?${assigneeParams}`)).json(),
  });
  const select = (label: string, value: string, set: (s: string) => void, options: string[]) => (
    <label className="flex flex-col gap-1">
      {label}
      <select
        aria-label={label}
        className="rounded border bg-background p-2"
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setCursor(null);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <AdminSidebar>
      <div className="p-4 md:p-6 space-y-5 min-w-0">
        <h1 className="text-2xl font-semibold">Follow-ups</h1>
        <p>Lead and client tasks. Due dates and the overdue clock use UTC.</p>
        <div className="flex flex-wrap gap-3">
          {select("Record type", kind, setKind, ["all", "lead", "client"])}
          {select("Completion", completion, setCompletion, ["open", "completed", "all"])}
          {select("Due", due, setDue, ["all", "overdue", "upcoming", "undated"])}
          {select("Owner", owner, setOwner, ["all", "mine", "unassigned", "user"])}
          <Button
            onClick={async () => {
              const firstPageParams = new URLSearchParams(params);
              firstPageParams.delete("cursor");
              // Invalidate the destination, not the currently observed cursor page.
              await queryClient.invalidateQueries({
                queryKey: [endpoint, firstPageParams.toString()],
                exact: true,
                refetchType: "none",
              });
              if (cursor) setCursor(null);
              else void worklist.refetch();
            }}
          >
            Refresh worklist
          </Button>
        </div>
        <section aria-label="Assignee lookup" className="space-y-2">
          <label>
            Find an assignee
            <Input
              value={assigneeQuery}
              onChange={(e) => {
                setAssigneeQuery(e.target.value);
                setAssigneeCursor(null);
              }}
            />
          </label>
          {assignees.isError ? (
            <div role="alert">
              Assignees could not be loaded.{" "}
              <Button onClick={() => void assignees.refetch()}>Retry assignees</Button>
            </div>
          ) : null}
          {owner === "user" ? (
            <label>
              Owner account
              <select
                aria-label="Owner account"
                className="ml-2 max-w-full rounded border bg-background p-2"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  setOwnerName(e.target.selectedOptions[0]?.textContent ?? "Selected account");
                  setCursor(null);
                }}
              >
                <option value="">Choose an account</option>
                {assigneeId && !assignees.data?.items.some((item) => item.id === assigneeId) ? (
                  <option value={assigneeId}>{ownerName}</option>
                ) : null}
                {assignees.data?.items.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {assigneeCursor ? (
            <Button variant="outline" onClick={() => setAssigneeCursor(null)}>
              First assignees
            </Button>
          ) : null}
          {assignees.data?.nextCursor ? (
            <Button variant="outline" onClick={() => setAssigneeCursor(assignees.data!.nextCursor)}>
              More assignees
            </Button>
          ) : null}
        </section>
        {worklist.isError ? (
          <div role="alert">
            Follow-ups could not be loaded.{" "}
            <Button onClick={() => void worklist.refetch()}>Retry worklist</Button>
          </div>
        ) : null}
        {worklist.isLoading && !worklist.data ? <p role="status">Loading follow-ups…</p> : null}
        <div className="space-y-3">
          {worklist.data?.items.map((item) => (
            <TaskRow
              key={`${item.kind}:${item.taskId}`}
              item={item}
              assignees={assignees.data?.items ?? []}
            />
          ))}
          {worklist.data?.items.length === 0 ? <p>No matching follow-ups.</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {cursor ? <Button onClick={() => setCursor(null)}>First page</Button> : null}
          {worklist.data?.nextCursor && !worklist.isError ? (
            <Button onClick={() => setCursor(worklist.data!.nextCursor)}>Next page</Button>
          ) : null}
        </div>
      </div>
    </AdminSidebar>
  );
}
