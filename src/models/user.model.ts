import mongoose, { Schema, InferSchemaType } from "mongoose";

export const UserRoleEnum = {
  USER: "user",
  ADMIN: "admin",
} as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    role: {
      type: String,
      enum: Object.values(UserRoleEnum),
      default: UserRoleEnum.USER
    }
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.model("User", userSchema);
