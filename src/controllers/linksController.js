// src/controllers/linksController.js
import pool from "../db.js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to 404.html
const viewsPath = path.join(__dirname, "../views");

// Helper: random 8-char code
function generateCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 8);
}

// CREATE short URL
export async function createShortUrl(req, res) {
  try {
    console.log("🟨 [DEBUG] POST /api/links:", req.body);

    const { target_url, code } = req.body;

    if (!target_url) {
      return res.status(400).json({ error: "target_url is required" });
    }

    let shortCode = code || generateCode();

    const exists = await pool.query(
      "SELECT code FROM links WHERE code = $1",
      [shortCode]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Code already exists" });
    }

    const result = await pool.query(
      `INSERT INTO links (code, target_url)
       VALUES ($1, $2)
       RETURNING code, target_url, total_clicks, last_clicked, created_at`,
      [shortCode, target_url]
    );

    console.log("✅ Created:", result.rows[0]);
    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("💥 createShortUrl error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// GET all links
export async function getAllLinks(req, res) {
  try {
    console.log("🟦 [DEBUG] GET /api/links");

    const result = await pool.query(
      "SELECT * FROM links ORDER BY created_at DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error("💥 getAllLinks error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// GET stats
export async function getStats(req, res) {
  try {
    const { code } = req.params;
    console.log("🟩 [DEBUG] GET /api/links/" + code);

    const result = await pool.query(
      "SELECT code, target_url, total_clicks, last_clicked, created_at FROM links WHERE code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error("💥 getStats error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// DELETE URL
export async function deleteUrl(req, res) {
  try {
    const { code } = req.params;
    console.log("🗑️ [DEBUG] DELETE /api/links/" + code);

    await pool.query("DELETE FROM links WHERE code = $1", [code]);

    res.json({ success: true });

  } catch (err) {
    console.error("💥 deleteUrl error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// REDIRECT
export async function redirectUrl(req, res) {
  try {
    const { code } = req.params;
    console.log("➡️ [DEBUG] Redirect request /" + code);

    const result = await pool.query(
      "SELECT target_url FROM links WHERE code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      console.log("❌ Redirect code not found:", code);

      // FIX: send absolute path
      return res
        .status(404)
        .sendFile(path.join(viewsPath, "404.html"));
    }

    const url = result.rows[0].target_url;

    await pool.query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked = NOW()
       WHERE code = $1`,
      [code]
    );

    console.log("🔁 Redirecting to:", url);
    res.redirect(url);

  } catch (err) {
    console.error("💥 redirectUrl error:", err);
    return res.status(500).send("Server error");
  }
}
