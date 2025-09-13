import express from "express";
import { validate } from "../middleware/validate.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { authSchema, createUserSchema, updateUserSchema } from "../scemas/user.scema";
import {
  createUser,
  loginUser,
  updateUser,
  getUser,
  deleteUser
} from "../controllers/user.controller";

const router = express.Router();

router.post("/signup", validate(createUserSchema), createUser);
router.post("/login", validate(authSchema), loginUser);
router.get("/me", authMiddleware, getUser);
router.put("/me", authMiddleware, validate(updateUserSchema), updateUser);
router.delete("/me", authMiddleware, deleteUser);

export default router;
