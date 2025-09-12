import express from "express";
import { validate } from "../middleware/validate.middleware";
import { createUserSchema } from "../scemas/user.scema";
import {
  createUser
} from "../controllers/user.controller";

const router = express.Router();

router.post("/", validate(createUserSchema), createUser);

export default router;
