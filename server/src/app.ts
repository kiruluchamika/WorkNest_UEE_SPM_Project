import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { categoryRoutes } from "./routes/category.routes";
import { gigRoutes } from "./routes/gig.routes";
import { adminGigRoutes } from "./routes/admin-gig.routes";
import { applicationSettingsRoutes } from "./routes/applicationSettings.routes";
import { applicationRoutes } from "./routes/applications.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
// Raised from the default 100kb so gig/profile photos (sent as base64 data URIs) fit.
app.use(express.json({ limit: "8mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", categoryRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/admin/gigs", adminGigRoutes);
app.use("/api/application-settings", applicationSettingsRoutes);
app.use("/api/applications", applicationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
