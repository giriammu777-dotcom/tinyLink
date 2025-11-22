// src/controllers/linksController.js
import pool from "../db.js";
import crypto from "crypto";

// Generate random 8-character code
function generateCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 8);
}

// CREATE short URL and return full row
export async function createShortUrl(req, res) {
  try {
    const { target_url, code } = req.body;

    if (!target_url)
      return res.status(400).json({ error: "target_url is required" });

    // Generate random code if not provided
    let shortCode = code || crypto.randomBytes(4).toString("hex").slice(0, 8);

    // Check if the code already exists
    const exists = await pool.query(
      "SELECT code FROM links WHERE code = $1",
      [shortCode]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Code already exists" });
    }

    // Insert and immediately return full object
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

// GET all links
export async function getAllLinks(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM links ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

// GET stats for a code — returns a single JSON object
export async function getStats(req, res) {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ error: "code is required" });

    const result = await pool.query(
      "SELECT code, target_url, total_clicks, last_clicked, created_at FROM links WHERE code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    // result.rows[0] is a plain JS object with the columns above
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// DELETE link
export async function deleteUrl(req, res) {
  try {
    const { code } = req.params;
    await pool.query("DELETE FROM links WHERE code = $1", [code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

// REDIRECT
export async function redirectUrl(req, res) {
  try {
    const { code } = req.params;

    const result = await pool.query(
      "SELECT target_url FROM links WHERE code = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).sendFile("404.html");
    }

    const url = result.rows[0].target_url;

    await pool.query(
      `UPDATE links
       SET total_clicks = total_clicks + 1,
           last_clicked = NOW()
       WHERE code = $1`,
      [code]
    );

    res.redirect(url);

  } catch (err) {
    res.status(500).send("Server error");
  }
}
