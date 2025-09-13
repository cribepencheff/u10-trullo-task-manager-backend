import { Request, Response } from "express";
import { ProtectedRequest } from "../middleware/auth.middleware";
import { UserModel } from "../models/user.model";
import bcrypt from "bcrypt";
import { createJWT } from "../utils/jwt.utils";

const SALT_ROUNDS = 10;

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Saved hashed PW to DB
    const user = new UserModel({ name, email, password: hashedPassword });
    await user.save();

    // Exclude password from response,
    const { password: _password, ...userSafe } = user.toJSON();

    res.status(201).json({ message: "User created", user: userSafe});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
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
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
};

export const deleteUser = async (req: Request, res: Response) => {
};
