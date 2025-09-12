import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const DB_NAME = process.env.DB_NAME;

  if (!MONGODB_URI) throw new Error("MONGODB_URI not found in .env");
  if (!DB_NAME) throw new Error("DB_NAME not found in .env");

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

  if (!mongoose.connection.db) {throw new Error("MongoDB connection not initialized")}
  await mongoose.connection.db.admin().ping();
  console.log("✅ MongoDB connected and responding");
}
