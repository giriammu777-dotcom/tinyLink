// src/server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import linksRouter from "./routes/links.js";
import healthRouter from "./routes/health.js";
import { redirectUrl } from "./controllers/linksController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;

// dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Views
const viewsPath = path.join(__dirname, "views");

// API Routes
app.use("/api/links", linksRouter);
app.use("/health", healthRouter);

// Frontend Pages (must be BEFORE redirect route)
app.get("/", (req, res) => {
  res.sendFile(path.join(viewsPath, "index.html"));
});

app.get("/code/:code", (req, res) => {
  res.sendFile(path.join(viewsPath, "stats.html"));
});

// Redirect route (MUST BE LAST normal route)
app.get("/:code", redirectUrl);

// 404 Handler (ALWAYS LAST)
app.use((req, res) => {
  res.status(404).sendFile(path.join(viewsPath, "404.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
