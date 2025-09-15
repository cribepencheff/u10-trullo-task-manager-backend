import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { UserModel } from "../models/user.model";
import { createJWT } from "../utils/jwt.utils";
import { TaskModel } from "../models/task.model";

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Saved hashed PW to DB
    const user = new UserModel({ name, email, password: hashedPassword });
    await user.save();

    // Exclude password from response.
    const { password: _password, ...userSafe } = user.toJSON();

    return res.status(201).json({ user: userSafe});
  } catch (error) {
    console.error("[users/createUser]", error);
    return res.status(500).json({ error: "Error when creating a new user." });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Generate JWT
    const token = createJWT(user);
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    // TODO: Remove console log before production
    console.log("Generated JWT:", token);
    return res.status(200).json({ message: "Login successful", token, expiresIn });

  } catch (error) {
    console.error("[users/loginUser]", error);
    return res.status(500).json({ error: "Error logging in." });
  }
}

export const getUser = async (req: ProtectedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(userId as string) } },
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "assignedTo",
          as: "tasks",
        },
      },
      { $project: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        tasks: { _id: 1 }
      }}
    ];

    const [user] = await UserModel.aggregate(pipeline);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("[users/getUser]", error);
    return res.status(500).json({ error: "Error fetching user." });
  }
};

export const updateUser = async (req: ProtectedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { name, email, password } = req.body;

    const newUserData: Partial<InstanceType<typeof UserModel>> = {};
    if (name) newUserData.name = name;
    if (email) newUserData.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      newUserData.password = hashedPassword;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: newUserData },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Exclude password from response.
    const { password: _password, ...userSafe } = updatedUser.toJSON();

    return res.status(200).json({ message: "User updated successfully", user: userSafe });
  } catch (error) {
    console.error("[users/updateUser]", error);
    return res.status(500).json({ error: "Error when updating new user." });
  }
};

export const deleteUser = async (req: ProtectedRequest, res: Response) => {
  const targetUserId = req.params.id;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  if (!requesterId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Admin account can not delete itself.
  // TODO: Future improvement - transfer admin rights before deletion
  if (requesterRole === "admin" && requesterId === targetUserId) {
    return res.status(403).json({ error: "Forbidden: Admin cannot delete their own account" });
  }

  if (requesterRole !== "admin" && requesterId !== targetUserId) {
    return res.status(403).json({ error: "Forbidden: You can only delete your own account" });
  }

  try {
    const deletedUser = await UserModel.findByIdAndDelete(targetUserId).select("-password");

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found. Cannot delete non-existent user." });
    }

    await TaskModel.updateMany(
      { assignedTo: deletedUser._id },
      { $set: { assignedTo: null } }
    );

    return res.status(200).json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    console.error("[users/deleteUser]", error);
    return res.status(500).json({ error: "Error deleting user." });
  }
};
