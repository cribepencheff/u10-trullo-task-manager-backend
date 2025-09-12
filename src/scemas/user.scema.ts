import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[\W_]/, "Password must contain at least one special character"),
});

export const updateUserSchema = z.object({
  oldPassword: z.string()
    .min(8)
    .regex(/[\W_]/, "Password must contain at least one special character"),
  newPassword: z.string()
    .min(8)
    .regex(/[\W_]/, "Password must contain at least one special character"),
});
