import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface ProtectedRequest extends Request {
  user?: JwtPayload;
}

const { JWT_SECRET } = process.env;

export const authMiddleware = ( req: ProtectedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" "); // Bearer <token>

  console.log(scheme, token);

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized request. Missing or invalid token." });
  }

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};