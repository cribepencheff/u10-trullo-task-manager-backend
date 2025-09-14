import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface ProtectedRequest extends Request {
  user?: JwtPayload & { role?: string };
}

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

export const authMiddleware = ( req: ProtectedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" "); // Bearer <token>…

  // console.log(scheme, token);
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Unauthorized request. Missing or invalid token." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export const adminMiddleware = ( req: ProtectedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
}
