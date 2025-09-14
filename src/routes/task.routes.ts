import express from "express";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import {
  createTask,
  getTasks,
  getTaskById
} from "../controllers/task.controller";

const router = express.Router();

router.post("/", authMiddleware, createTask);
router.get("/all", authMiddleware, adminMiddleware, getTasks);
router.get("/", authMiddleware, getTasks);

router.get("/:id", authMiddleware, getTaskById);

export default router;
