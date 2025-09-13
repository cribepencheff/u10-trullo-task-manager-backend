import * as z from "zod";

const passwordRegex = /[\W_]/;
const passwordMessages = {
  minChar: "Password must be at least 8 characters long",
  specialChar: "Password must contain at least one special character"
};

export const authSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .transform(str => str.trim())
    .pipe(z.email({ message: "Invalid email format" })),
  password: z.string()
    .min(1, "Password is required")
    .trim()
    .min(8, passwordMessages.minChar)
    .regex(passwordRegex, passwordMessages.specialChar),
});

export const createUserSchema = authSchema.extend({
  name: z.string()
    .trim()
    .min(3, "Name must be at least 3 characters long"),
});

// Partial makes all fields optional
export const updateUserSchema = createUserSchema.partial();
