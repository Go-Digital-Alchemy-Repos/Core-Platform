import type { CrmLeadNote, CrmClientNote } from "./schema";

/** Current profile name, not a historical author snapshot. */
export type CrmLeadNoteDetail = CrmLeadNote & { authorName: string | null };
export type CrmClientNoteDetail = CrmClientNote & { authorName: string | null };
