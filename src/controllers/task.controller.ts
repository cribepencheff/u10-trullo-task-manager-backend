import mongoose from "mongoose";
import { Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { TaskModel, TaskStatusEnum } from "../models/task.model";
import { UserModel } from "../models/user.model";

export const createTask = async (req: ProtectedRequest, res: Response) => {
  try {
    const { title, description, assignedTo, status } = req.body;
    // To ensure case-insensitive status input
    const normalizedStatus = status?.toLowerCase();

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (assignedTo && !(await UserModel.exists({ _id: assignedTo }))) {
      return res.status(404).json({ error: "Assigned user not found" });
    }

    if (status && !Object.values(TaskStatusEnum).includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${Object.values(TaskStatusEnum).join(", ")}`
      });
    }

    const newTask = await TaskModel.create({
      title,
      description,
      assignedTo: assignedTo || null,
      status: normalizedStatus,
      finishedAt: normalizedStatus === TaskStatusEnum.DONE ? new Date() : null,
      finishedBy: normalizedStatus === TaskStatusEnum.DONE ? req.user?.id : null,
    });

    const populatedTask = await newTask.populate([
      { path: "assignedTo", select: "name email role" },
      { path: "finishedBy", select: "name email role" }
    ]);

    return res.status(201).json({ task: populatedTask });

  } catch (error) {
    console.error("[tasks/createTask]", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
};

export const getTasks = async (req: ProtectedRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.user?.role !== "admin") {
      filter.assignedTo = req.user?.id;
    }

    const tasks = await TaskModel.find(filter).populate({
      path: "assignedTo",
      select: "name email",
    });

    return res.status(200).json({ tasks });

  } catch (error) {
    console.error("[tasks/getTasks]", error);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getTaskById = async (req: ProtectedRequest, res: Response) => {
  try {
    const task = await TaskModel.findById(req.params.id).populate(
      "assignedTo",
      "name email"
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (req.user?.role !== "admin" && task.assignedTo && task.assignedTo._id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden: Not allowed to view this task" });
    }

    return res.status(200).json({ task });
  } catch (error) {
    console.error("[tasks/getTaskById]", error);
    return res.status(500).json({ error: "Failed to fetch task" });
  }
};

export const updateTask = async (req: ProtectedRequest, res: Response) => {
  try {
    const { title, description, status, assignedTo } = req.body;
    const task = await TaskModel.findById(req.params.id);
    // To ensure case-insensitive status updates
    const normalizedStatus = status?.toLowerCase();

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        // Explicitly unassigning the task
        (task.assignedTo as mongoose.Types.ObjectId | null) = null;
      } else {
        const assignedUser = await UserModel.findById(assignedTo);
        if (!assignedUser) return res.status(404).json({ error: "Assigned user not found" });
        task.assignedTo = assignedTo;
      }
    }

    if (status && !Object.values(TaskStatusEnum).includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${Object.values(TaskStatusEnum).join(", ")}`
      });
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = normalizedStatus;
    if (normalizedStatus === TaskStatusEnum.DONE && !task.finishedBy) {
      task.finishedBy = req.user?.id;
    }
    if (normalizedStatus !== TaskStatusEnum.DONE) {
      // Explicitly clear finishedBy if status is changed from DONE to something else
      (task.finishedBy as mongoose.Types.ObjectId | null) = null;
    }

    await task.save();

    const populatedTask = await TaskModel.findById(task._id)
      .populate({ path: "assignedTo", select: "name email role" })
      .populate({ path: "finishedBy", select: "name email role" })
      .lean();

    return res.status(200).json({ task: populatedTask });

  } catch (error) {
    console.error("[tasks/updateTask]", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
};

export const deleteTask = async (req: ProtectedRequest, res: Response) => {
  try {
    const task = await TaskModel.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    const assignedId = task.assignedTo?._id?.toString() || task.assignedTo?.toString() || null;
    if (req.user?.role !== "admin" && assignedId !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden: Not allowed to delete this task." });
    }

    await task.deleteOne();
    return res.status(200).json({ message: "Task deleted successfully", task });

  } catch (error) {
    console.error("[tasks/deleteTask]", error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
};
