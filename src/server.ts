import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

dotenv.config();
import taskRoutes from "./routes/task.routes";
import userRoutes from "./routes/user.routes";

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Start the server only when not running tests
// This allows tests to import the app without starting the server
if (!process.env.JEST_WORKER_ID) {
  // Global Error Handling
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✅ REST API is running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("⚠️  DB connection error:", err.message);
      process.exit(1);
    });
}


// For integration testing
export default app;
