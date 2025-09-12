import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { UserModel } from "../src/models/user.model";
import { TaskModel } from "../src/models/task.model";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");
if (!DB_NAME) throw new Error("Missing DB_NAME in .env");

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const statuses = ["to-do", "in progress", "blocked", "done"];

async function seedDatabase() {
  await mongoose.connect(MONGODB_URI!, { dbName: DB_NAME });
  console.log("Connected:", MONGODB_URI?.split("@")[1]);

  // Reset database
  await Promise.all([
    UserModel.deleteMany({}),
    TaskModel.deleteMany({}),
  ]);

  // Create users
  const users = await Promise.all(
    Array.from({ length: 20 }).map(async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      return {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: passwordHash,
      };
    })
  );

  const userDocs = await UserModel.insertMany(users, { ordered: false });

  // Create tasks
  const tasks = Array.from({ length: 50 }).map(() => {
    const status = rand(statuses);
    const assigned =
      Math.random() > 0.3 ? rand(userDocs)._id : null;
    return {
      title: faker.lorem.sentence({ min: 3, max: 7 }),
      description: faker.lorem.paragraph(),
      status,
      assignedTo: assigned,
    };
  });

  await TaskModel.insertMany(tasks, { ordered: false });

  const totalUsers = await UserModel.countDocuments();
  const totalTasks = await TaskModel.countDocuments();

  console.log(
    `Seeding completed: ${totalUsers} users, ${totalTasks} tasks.`
  );

  await mongoose.disconnect();
}

seedDatabase().catch((e) => {
  console.error(e);
  process.exit(1);
});
