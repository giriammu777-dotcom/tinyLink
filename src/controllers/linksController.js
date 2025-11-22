// src/controllers/linksController.js
import pool from "../db.js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to views folder (absolute)
const viewsPath = path.join(__dirname, "../views");

// Generate random 8-character code
function generateCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 8);
}

/* ======================================================
   CREATE SHORT URL
====================================================== */
export async function createShortUrl(req, res) {
  try {
    const { target_url, code } = req.body;

    if (!target_url) {
      return res.status(400).json({ error: "target_url is required" });
    }

    let shortCode = code || generateCode();

    // Check if code already exists
    const exists = await pool.query(
      "SELECT code FROM links WHERE code = $1",
      [shortCode]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Code already exists" });
    }

    // Insert new record
    const result = await pool.query(
      `INSERT INTO links (code, target_url)
       VALUES ($1, $2)
       RETURNING code, target_url, total_clicks, last_clicked, created_at`,
      [shortCode, target_url]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("createShortUrl error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* ======================================================
   GET ALL LINKS
====================================================== */
export async function getAllLinks(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM links ORDER BY created_at DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error("getAllLinks error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* ======================================================
   GET STATS FOR ONE SHORT CODE
====================================================== */
export async function getStats(req, res) {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT code, target_url, total_clicks, last_clicked, created_at
       FROM links WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* ======================================================
   DELETE SHORT URL
====================================================== */
export async function deleteUrl(req, res) {
  try {
    const { code } = req.params;

    await pool.query("DELETE FROM links WHERE code = $1", [code]);

    res.json({ success: true });

  } catch (err) {
    console.error("deleteUrl error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* ======================================================
   REDIRECT TO TARGET URL
====================================================== */
export async function redirectUrl(req, res) {
  try {
    const { code } = req.params;

    // Ignore browsers requesting /favicon.ico
    if (code === "favicon.ico") {
      return res.status(204).end();
    }

    const result = await pool.query(
      "SELECT target_url FROM links WHERE code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      // serve absolute 404 path
      return res.status(404).sendFile(path.join(viewsPath, "404.html"));
    }

    const url = result.rows[0].target_url;

    // Update click stats
    await pool.query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked = NOW()
       WHERE code = $1`,
      [code]
    );

    res.redirect(url);

  } catch (err) {
    console.error("redirectUrl error:", err);
    return res.status(500).send("Server error");
  }
}
