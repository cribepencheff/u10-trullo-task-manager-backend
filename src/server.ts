import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();
import taskRoutes from "./routes/task.routes";

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/tasks", taskRoutes);

// Global Error Handling
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ REST API is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("⚠️ DB connection error:", err.message);
    process.exit(1);
  });