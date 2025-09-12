import { Request, Response } from "express";
import { TaskModel } from "../models/task.model";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await TaskModel.find().populate({
      path: "assignedTo",
      select: "name email",
    });
    res.json(tasks);
  } catch (error) {
    console.error("[/tasks]", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const task = await TaskModel.findById(req.params.id).populate(
      "assignedTo",
      "name email"
    );
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch task" });
  }
};
