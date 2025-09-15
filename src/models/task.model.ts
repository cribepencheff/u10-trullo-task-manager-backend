import mongoose, { Schema, InferSchemaType } from "mongoose";
import "./user.model"; // Register User model first to avoid Mongoose populate errors

export const TaskStatusEnum = {
  TO_DO: "to-do",
  IN_PROGRESS: "in progress",
  BLOCKED: "blocked",
  DONE: "done",
} as const;

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(TaskStatusEnum),
      default: TaskStatusEnum.TO_DO,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    finishedAt: { type: Date, default: null, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

taskSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === TaskStatusEnum.DONE) {
    this.finishedAt = new Date();
  } else if (this.isModified("status") && this.status !== TaskStatusEnum.DONE) {
    this.finishedAt = null;
  }
  next();
});

export type Task = InferSchemaType<typeof taskSchema>;
export const TaskModel = mongoose.model("Task", taskSchema);
