import express from "express";
import { connectWhatsApp, getStatus, resetWhatsApp } from "../controllers/whatsappController.js";

const router = express.Router();

router.get("/connect/:userId", connectWhatsApp);
router.get("/status/:userId", getStatus);
router.post("/reset/:userId", resetWhatsApp);

export default router;
