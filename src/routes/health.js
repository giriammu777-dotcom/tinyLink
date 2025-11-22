// src/routes/health.js
import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const now = new Date().toISOString();
  try {
    // quick DB probe
    const result = await pool.query("SELECT 1 AS ok");
    const dbOk = Array.isArray(result?.rows) && result.rows[0]?.ok === 1;

    return res.status(200).json({
      status: "ok",
      timestamp: now,
      uptime_seconds: Math.floor(process.uptime()),
      database: dbOk ? "connected" : "unknown",
      note: dbOk ? "healthy" : "db probe returned unexpected result"
    });
  } catch (err) {
    // log full error server-side for debugging
    console.error("[/health] DB probe failed:", err && err.stack ? err.stack : err);

    // return sanitized info to client
    return res.status(500).json({
      status: "error",
      timestamp: now,
      uptime_seconds: Math.floor(process.uptime()),
      database: "connection_failed",
      error: err?.message || String(err)
    });
  }
});

export default router;
