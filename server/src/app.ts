import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
