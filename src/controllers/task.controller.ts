import { Request, Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { TaskModel } from "../models/task.model";
import { UserModel } from "../models/user.model";

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (assignedTo) {
      const assignedUser = await UserModel.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ error: "Assigned user not found" });
      }
    }

    const newTask = await TaskModel.create({
      title,
      description,
      assignedTo: assignedTo || null,
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
      { $unwind: {
          path: "$assignedTo",
          preserveNullAndEmptyArrays: true
        }
      },
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

export const updateTask = async (req: Request, res: Response) => {
};

export const deleteTask = async (req: Request, res: Response) => {
};
