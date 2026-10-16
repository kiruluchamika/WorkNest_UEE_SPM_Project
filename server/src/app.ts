import { requireAuth } from "./middleware/auth.middleware";
import { downloadDocument } from "./services/privateDocuments";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { categoryRoutes } from "./routes/category.routes";
import { gigRoutes } from "./routes/gig.routes";
import { adminGigRoutes } from "./routes/admin-gig.routes";
import { applicationSettingsRoutes } from "./routes/applicationSettings.routes";
import { applicationRoutes } from "./routes/applications.routes";
import { verifierApplicationRoutes, verifierSelfServiceRoutes } from "./routes/verifierApplications.routes";
import { userRoutes } from "./routes/user.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { adminReviewRoutes } from "./routes/admin-review.routes";
import { reviewRoutes } from "./routes/review.routes";
import { adminReportRoutes } from "./routes/admin-report.routes";
import { adminUserRoutes } from "./routes/admin-user.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import { SRI_LANKAN_DISTRICTS } from "./constants/districts";
import { adminVerificationRoutes, jobSeekerVerificationRoutes, verifierWorkRoutes } from "./routes/verificationRequests.routes";

export const app = express();

app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
// Raised from the default 100kb so gig/profile photos (sent as base64 data URIs) fit.
app.use(express.json({ limit: "8mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/districts", (_req, res) => {
  res.json({ districts: SRI_LANKAN_DISTRICTS });
});

app.get("/api/private-documents/:id", requireAuth, downloadDocument);
app.use("/api/auth", authRoutes);
app.use("/api", categoryRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/admin/gigs", adminGigRoutes);
app.use("/api/application-settings", applicationSettingsRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin/verifier-applications", verifierApplicationRoutes);
app.use("/api/verifier/applications", verifierSelfServiceRoutes);
app.use("/api/jobseeker/verification-requests", jobSeekerVerificationRoutes);
app.use("/api/verifier/work", verifierWorkRoutes);
app.use("/api/admin/verification-work", adminVerificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api", reviewRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
