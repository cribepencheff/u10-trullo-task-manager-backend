import { Schema, model, InferSchemaType } from "mongoose";
import "./user.model"; // Register User model first to avoid Mongoose populate errors

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["to-do", "in progress", "blocked", "done"],
      default: "to-do",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finishedAt: { type: Date, default: null, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

taskSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "done") {
    this.finishedAt = new Date();
  } else if (this.isModified("status") && this.status !== "done") {
    this.finishedAt = null;
  }
  next();
});

export type TaskType = InferSchemaType<typeof taskSchema>;
export const Task = model<TaskType>("Task", taskSchema);
