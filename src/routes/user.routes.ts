import express from "express";
import { validate } from "../middleware/validate.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { authSchema, createUserSchema } from "../scemas/user.scema";
import {
  createUser,
  getUser,
  loginUser
} from "../controllers/user.controller";

const router = express.Router();

router.post("/signup", validate(createUserSchema), createUser);
router.post("/login", validate(authSchema), loginUser);
router.get("/me", authMiddleware, getUser);

export default router;
