import { Router } from "express";
import { z } from "zod";
import { CRM_LEAD_STAGES, crmLeadInputSchema } from "@shared/schema";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";
import { createOrUpdateCrmLead } from "../../services/crm.service";
import { paramString } from "../../utils/params";
import type { CrmLeadStage } from "@shared/schema";

const router = Router();

const leadUpdateSchema = crmLeadInputSchema.partial();
const noteSchema = z.object({ body: z.string().trim().min(1, "Note is required") });
const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  dueAt: z.coerce.date().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});
const taskUpdateSchema = taskCreateSchema.partial().extend({
  completed: z.boolean().optional(),
});

function isCrmLeadStage(value: unknown): value is CrmLeadStage {
  return typeof value === "string" && CRM_LEAD_STAGES.includes(value as CrmLeadStage);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const stage = isCrmLeadStage(req.query.stage)
      ? req.query.stage
      : "all";
    res.json(await storage.crm.listLeads({ query, stage }));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await createOrUpdateCrmLead({ ...req.body, source: req.body?.source ?? "manual" }, req.user?.id);
    res.status(result.duplicate ? 200 : 201).json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const detail = await storage.crm.getLeadDetail(paramString(req.params.id));
    if (!detail) return res.status(404).json({ message: "Lead not found" });
    res.json(detail);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = leadUpdateSchema.parse(req.body);
    const lead = await storage.crm.updateLead(paramString(req.params.id), parsed);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  })
);

router.post(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const leadId = paramString(req.params.id);
    const lead = await storage.crm.getLeadById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const parsed = noteSchema.parse(req.body);
    res.status(201).json(await storage.crm.createNote({
      leadId,
      body: parsed.body,
      createdById: req.user?.id ?? null,
    }));
  })
);

router.post(
  "/:id/tasks",
  asyncHandler(async (req, res) => {
    const leadId = paramString(req.params.id);
    const lead = await storage.crm.getLeadById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const parsed = taskCreateSchema.parse(req.body);
    res.status(201).json(await storage.crm.createTask({
      leadId,
      title: parsed.title,
      dueAt: parsed.dueAt ?? null,
      assignedToId: parsed.assignedToId ?? req.user?.id ?? null,
      createdById: req.user?.id ?? null,
      completed: false,
    }));
  })
);

router.patch(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    const parsed = taskUpdateSchema.parse(req.body);
    const task = await storage.crm.updateTask(paramString(req.params.taskId), parsed);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  })
);

export default router;
