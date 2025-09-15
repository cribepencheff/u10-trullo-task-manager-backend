import { Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { TaskModel, TaskStatusEnum } from "../models/task.model";
import { UserModel } from "../models/user.model";
import { finished } from "stream";

export const createTask = async (req: ProtectedRequest, res: Response) => {
  try {
    const { title, description, assignedTo, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (assignedTo && !(await UserModel.exists({ _id: assignedTo }))) {
      return res.status(404).json({ error: "Assigned user not found" });
    }

    if (status && !Object.values(TaskStatusEnum).includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${Object.values(TaskStatusEnum).join(", ")}`
      });
    }

    const newTask = await TaskModel.create({
      title,
      description,
      assignedTo: assignedTo || null,
      status,
      finishedAt: status === TaskStatusEnum.DONE ? new Date() : null,
      finishedBy: status === TaskStatusEnum.DONE ? req.user?.id : null,
    });

    const pipeline = [
      { $match: { _id: newTask._id } },
      { $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        }
      },
      { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },
      { $lookup: {
          from: "users",
          localField: "finishedBy",
          foreignField: "_id",
          as: "finishedBy",
        }
      },
      { $unwind: { path: "$finishedBy", preserveNullAndEmptyArrays: true } },
      { $project: {
          title: 1,
          description: 1,
          status: 1,
          finishedAt: 1,
          createdAt: 1,
          assignedTo: {
            _id: "$assignedTo._id",
            name: "$assignedTo.name",
            email: "$assignedTo.email",
            role: "$assignedTo.role"
          },
          finishedBy: {
            _id: "$finishedBy._id",
            name: "$finishedBy.name",
            email: "$finishedBy.email",
            role: "$finishedBy.role"
          }
        }
      },
    ];

    const [task] = await TaskModel.aggregate(pipeline);
    return res.status(201).json( { task });

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

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (req.user?.role !== "admin" && task.assignedTo && task.assignedTo._id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden: Not allowed to edit this task" });
    }

    if (assignedTo) {
      const assignedUser = await UserModel.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ error: "Assigned user not found" });
      }
      task.assignedTo = assignedTo;
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;
    if (status === TaskStatusEnum.DONE && !task.finishedBy) {
      task.finishedBy = req.user?.id;
    }

    const populatedTask = await TaskModel.findById(task._id).populate(
      "assignedTo",
      "name email role"
    );
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

    if (req.user?.role !== "admin" && task.assignedTo && task.assignedTo._id.toString() !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden: Not allowed to delete this task" });
    }

    await task.deleteOne();
    return res.status(200).json({ message: "Task deleted successfully", task });

  } catch (error) {
    console.error("[tasks/deleteTask]", error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
};
