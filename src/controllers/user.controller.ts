import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";

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
