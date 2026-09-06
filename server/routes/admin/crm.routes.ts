import crmFollowUpsRoutes from "./crm-follow-ups.routes";
import { createCrmTask, updateCrmTask } from "../../services/crm-follow-ups.service";
import crmCustomFieldsRoutes from "./crm-custom-fields.routes";
import { requireRole } from "../../middleware/auth";
import {
  getCrmPipelineSettings,
  saveCrmPipelineSettings,
} from "../../services/crm-pipeline-settings.service";
import { Router } from "express";
import { z } from "zod";
import {
  CRM_CLIENT_STATUSES,
  CRM_LEAD_STAGES,
  crmClientUpdateSchema,
  crmLeadInputSchema,
} from "@shared/schema";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";
import {
  createManualCrmLead,
  createManualCrmClient,
  updateCrmLead,
} from "../../services/crm.service";
import { paramString } from "../../utils/params";
import type { CrmClientStatus, CrmLeadStage } from "@shared/schema";

const router = Router();
router.use(crmCustomFieldsRoutes);
router.use(crmFollowUpsRoutes);

router.get(
  "/settings/pipeline",
  asyncHandler(async (_req, res) => {
    res.json(await getCrmPipelineSettings());
  }),
);
router.put(
  "/settings/pipeline",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(await saveCrmPipelineSettings(req.body, req.user!.id));
  }),
);

const leadUpdateSchema = crmLeadInputSchema.partial();
const noteSchema = z.object({ body: z.string().trim().min(1, "Note is required") });
const clientNoteSchema = noteSchema;

function isCrmLeadStage(value: unknown): value is CrmLeadStage {
  return typeof value === "string" && CRM_LEAD_STAGES.includes(value as CrmLeadStage);
}

function isCrmClientStatus(value: unknown): value is CrmClientStatus {
  return typeof value === "string" && CRM_CLIENT_STATUSES.includes(value as CrmClientStatus);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const stage = isCrmLeadStage(req.query.stage) ? req.query.stage : "all";
    res.json(await storage.crm.listLeads({ query, stage }));
  }),
);

router.get(
  "/clients",
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : undefined;
    const status = isCrmClientStatus(req.query.status) ? req.query.status : "all";
    res.json(await storage.crm.listClients({ query, status }));
  }),
);

router.post(
  "/clients",
  asyncHandler(async (req, res) => {
    res.status(201).json(await createManualCrmClient(req.body));
  }),
);

router.get(
  "/clients/:id",
  asyncHandler(async (req, res) => {
    const detail = await storage.crm.getClientDetail(paramString(req.params.id));
    if (!detail) return res.status(404).json({ message: "Client not found" });
    res.json(detail);
  }),
);

router.patch(
  "/clients/:id",
  asyncHandler(async (req, res) => {
    const parsed = crmClientUpdateSchema.parse(req.body);
    const client = await storage.crm.updateClient(paramString(req.params.id), parsed);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  }),
);

router.post(
  "/clients/:id/notes",
  asyncHandler(async (req, res) => {
    const clientId = paramString(req.params.id);
    const client = await storage.crm.getClientById(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const parsed = clientNoteSchema.parse(req.body);
    res.status(201).json(
      await storage.crm.createClientNote({
        clientId,
        body: parsed.body,
        createdById: req.user?.id ?? null,
      }),
    );
  }),
);

router.post(
  "/clients/:id/tasks",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await createCrmTask("client", paramString(req.params.id), req.body, req.user!.id));
  }),
);

router.patch(
  "/clients/tasks/:taskId",
  asyncHandler(async (req, res) => {
    res.json(await updateCrmTask("client", paramString(req.params.taskId), req.body));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await createManualCrmLead(
      { ...req.body, source: req.body?.source ?? "manual" },
      req.user?.id,
    );
    res.status(result.duplicate ? 200 : 201).json(result);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const detail = await storage.crm.getLeadDetail(paramString(req.params.id));
    if (!detail) return res.status(404).json({ message: "Lead not found" });
    res.json(detail);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = leadUpdateSchema.parse(req.body);
    const lead = await updateCrmLead(paramString(req.params.id), parsed, req.user?.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  }),
);

router.post(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const leadId = paramString(req.params.id);
    const lead = await storage.crm.getLeadById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const parsed = noteSchema.parse(req.body);
    res.status(201).json(
      await storage.crm.createNote({
        leadId,
        body: parsed.body,
        createdById: req.user?.id ?? null,
      }),
    );
  }),
);

router.post(
  "/:id/tasks",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await createCrmTask("lead", paramString(req.params.id), req.body, req.user!.id));
  }),
);

router.patch(
  "/tasks/:taskId",
  asyncHandler(async (req, res) => {
    res.json(await updateCrmTask("lead", paramString(req.params.taskId), req.body));
  }),
);

export default router;
