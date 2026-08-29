import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { acknowledgeVerifierApproval, approveReactivationRequest, approveVerifierApplication, createReactivationRequest, createVerifierReapplication, getLatestReactivationRequest, getLatestVerifierApplication, getVerifierApplication, listVerifierApplications, rejectReactivationRequest, rejectVerifierApplication, suspendVerifierApplication } from "../controllers/verifierApplications.controller";
import { reactivationRequestSchema, rejectReactivationRequestSchema, rejectVerifierApplicationSchema, suspendVerifierApplicationSchema, verifierReapplicationSchema } from "../validators/verifierApplication.validator";

export const verifierApplicationRoutes = Router();
verifierApplicationRoutes.use(requireAuth, requireRole("admin"));
verifierApplicationRoutes.get("/", listVerifierApplications);
verifierApplicationRoutes.get("/:id", getVerifierApplication);
verifierApplicationRoutes.patch("/:id/approve", approveVerifierApplication);
verifierApplicationRoutes.patch("/:id/reject", validateBody(rejectVerifierApplicationSchema), rejectVerifierApplication);
verifierApplicationRoutes.patch("/:id/suspend", validateBody(suspendVerifierApplicationSchema), suspendVerifierApplication);
verifierApplicationRoutes.patch("/reactivation-requests/:requestId/approve", approveReactivationRequest);
verifierApplicationRoutes.patch("/reactivation-requests/:requestId/reject", validateBody(rejectReactivationRequestSchema), rejectReactivationRequest);

export const verifierSelfServiceRoutes = Router();
verifierSelfServiceRoutes.use(requireAuth, requireRole("verifier"));
verifierSelfServiceRoutes.get("/latest", getLatestVerifierApplication);
verifierSelfServiceRoutes.post("/", validateBody(verifierReapplicationSchema), createVerifierReapplication);
verifierSelfServiceRoutes.patch("/:id/acknowledge-approval", acknowledgeVerifierApproval);
verifierSelfServiceRoutes.get("/reactivation-request/latest", getLatestReactivationRequest);
verifierSelfServiceRoutes.post("/reactivation-request", validateBody(reactivationRequestSchema), createReactivationRequest);
