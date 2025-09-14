import { Request, Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { UserModel } from "../models/user.model";
import bcrypt from "bcrypt";
import { createJWT } from "../utils/jwt.utils";

const SALT_ROUNDS = 10;

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Saved hashed PW to DB
    const user = new UserModel({ name, email, password: hashedPassword });
    await user.save();

    // Exclude password from response.
    const { password: _password, ...userSafe } = user.toJSON();

    res.status(201).json({ message: "User created", user: userSafe});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error when creating a new user." });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT
    const token = createJWT(user);
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    console.log("Generated JWT:", token);
    res.status(200).json({ message: "Login successful", token, expiresIn });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in." });
  }
}

export const getUser = async (req: ProtectedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await UserModel.findById(userId).populate("tasks");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Exclude password from response,
    const { password: _password, ...userSafe } = user.toJSON();

    return res.status(200).json(userSafe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching user." });
  }
};

export const updateUser = async (req: ProtectedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
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
      return res.status(404).json({ message: "User not found" });
    }

    // Exclude password from response.
    const { password: _password, ...userSafe } = updatedUser.toJSON();

    res.status(200).json({ message: "User updated successfully", user: userSafe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error when updating new user." });
  }


};

export const deleteUser = async (req: ProtectedRequest, res: Response) => {
  const targetUserId = req.params.id;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  if (!requesterId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Admin account can not delete itself.
  // TODO: Future improvement - transfer admin rights before deletion
  if (requesterRole === "admin" && requesterId === targetUserId) {
    return res.status(403).json({ message: "Forbidden: Admin cannot delete their own account" });
  }

  if (requesterRole !== "admin" && requesterId !== targetUserId) {
    return res.status(403).json({ message: "Forbidden: You can only delete your own account" });
  }

  try {
    const deletedUser = await UserModel.findByIdAndDelete(targetUserId).select("-password");

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found. Cannot delete non-existent user." });
    }

    res.status(200).json({ message: "User deleted successfully", deletedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user." });
  }
};
