import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
  },
  { timestamps: true }
);

export type UserType = InferSchemaType<typeof userSchema>;
export const User = model<UserType>("User", userSchema);
