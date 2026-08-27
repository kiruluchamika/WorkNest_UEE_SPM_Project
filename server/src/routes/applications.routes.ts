import { Router } from "express";
import {
  submitApplication,
  checkApplication,
  listMyApplications,
  getApplicationById,
  withdrawApplication,
  listGigApplicants,
  shortlistApplication,
  rejectApplication,
  hireApplication,
  completeApplication,
} from "../controllers/applications.controller";
import { validateBody } from "../middleware/validate.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { submitApplicationSchema } from "../validators/application.validator";

export const applicationRoutes = Router();

// Youth: browse a gig to apply to, submit, and manage own applications
applicationRoutes.get("/check/:gigId", requireAuth, requireRole("jobseeker"), checkApplication);
applicationRoutes.get("/", requireAuth, requireRole("jobseeker"), listMyApplications);
applicationRoutes.post(
  "/",
  requireAuth,
  requireRole("jobseeker"),
  validateBody(submitApplicationSchema),
  submitApplication
);
applicationRoutes.patch("/:applicationId/withdraw", requireAuth, requireRole("jobseeker"), withdrawApplication);

// Business: review applicants for an owned gig and move them through the hiring workflow
applicationRoutes.get("/gig/:gigId", requireAuth, requireRole("shopowner"), listGigApplicants);
applicationRoutes.patch(
  "/:applicationId/shortlist",
  requireAuth,
  requireRole("shopowner"),
  shortlistApplication
);
applicationRoutes.patch("/:applicationId/reject", requireAuth, requireRole("shopowner"), rejectApplication);
applicationRoutes.patch("/:applicationId/hire", requireAuth, requireRole("shopowner"), hireApplication);
applicationRoutes.patch(
  "/:applicationId/complete",
  requireAuth,
  requireRole("shopowner"),
  completeApplication
);

// Shared: applicant themself, or the business that owns the related gig (checked in controller)
applicationRoutes.get("/:applicationId", requireAuth, getApplicationById);
