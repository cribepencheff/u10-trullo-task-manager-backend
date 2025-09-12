import express from "express";
import {
  getTasks,
  getTaskById
} from "../controllers/task.controller";

const router = express.Router();

router.get("/", getTasks);
router.get("/:id", getTaskById);

export default router;
