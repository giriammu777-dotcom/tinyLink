// src/routes/links.js
import { Router } from "express";
import {
  getAllLinks,
  createShortUrl,
  getStats,
  deleteUrl
} from "../controllers/linksController.js";

const router = Router();

// Debug: log when routes are mounted
console.log("🔗 linksRouter mounted at /api/links");

router.get("/", getAllLinks);           // GET all links
router.post("/", createShortUrl);       // CREATE short link
router.get("/:code", getStats);         // GET stats for code
router.delete("/:code", deleteUrl);     // DELETE a link

export default router;
