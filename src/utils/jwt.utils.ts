import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN  || "7d";

if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined in .env");

export const createJWT = (user: InstanceType<typeof UserModel>) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN } as jwt.SignOptions
  );
};
