// src/routes/links.js
import { Router } from "express";
import { getAllLinks, createShortUrl, getStats, deleteUrl } from "../controllers/linksController.js";

const router = Router();

router.get("/", getAllLinks);
router.post("/", createShortUrl);
router.get("/:code", getStats);       // <-- this returns a single JSON object
router.delete("/:code", deleteUrl);

export default router;
