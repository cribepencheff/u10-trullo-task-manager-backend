import { Request, Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { TaskModel } from "../models/task.model";

export const createTask = async (req: Request, res: Response) => {
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

    res.json(tasks);
  } catch (error) {
    console.error("[/tasks]", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
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

    if (req.user?.role !== "admin" && task.assignedTo?._id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden: Not allowed to view this task" });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
};

export const deleteTask = async (req: Request, res: Response) => {
};
