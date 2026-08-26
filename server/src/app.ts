import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { categoryRoutes } from "./routes/category.routes";
import { gigRoutes } from "./routes/gig.routes";
import { adminGigRoutes } from "./routes/admin-gig.routes";
import { applicationSettingsRoutes } from "./routes/applicationSettings.routes";
import { applicationRoutes } from "./routes/applications.routes";
import { verifierApplicationRoutes, verifierSelfServiceRoutes } from "./routes/verifierApplications.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import { SRI_LANKAN_DISTRICTS } from "./constants/districts";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/districts", (_req, res) => {
  res.json({ districts: SRI_LANKAN_DISTRICTS });
});

app.use("/api/auth", authRoutes);
app.use("/api", categoryRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/admin/gigs", adminGigRoutes);
app.use("/api/application-settings", applicationSettingsRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin/verifier-applications", verifierApplicationRoutes);
app.use("/api/verifier/applications", verifierSelfServiceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
