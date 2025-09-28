import express from "express";
import { validate } from "../middleware/validate.middleware";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import { authSchema, createUserSchema, updateUserSchema } from "../schemas/user.schema";
import {
  createUser,
  loginUser,
  updateUser,
  getUsers,
  getUser,
  deleteUser,
  resetPasswordReq,
  resetPasswordWithToken
} from "../controllers/user.controller";

const router = express.Router();

router.post("/signup", validate(createUserSchema), createUser);
router.post("/login", validate(authSchema), loginUser);
router.get("/", authMiddleware, adminMiddleware, getUsers);
router.get("/me", authMiddleware, getUser);
router.put("/me", authMiddleware, validate(updateUserSchema), updateUser);
router.delete("/:id", authMiddleware, deleteUser);
router.post("/reset-password", resetPasswordReq);
router.put("/reset-password/:token", resetPasswordWithToken);

export default router;
