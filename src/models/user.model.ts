import mongoose, { Schema, InferSchemaType } from "mongoose";

const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER }
  },
  { timestamps: true }
);

export const UserRoleEnum = UserRole;
export type User = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.model("User", userSchema);
