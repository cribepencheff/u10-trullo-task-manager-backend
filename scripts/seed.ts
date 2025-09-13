import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { UserModel, UserRoleEnum } from "../src/models/user.model";
import { TaskModel } from "../src/models/task.model";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const SALT_ROUNDS = 10;

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

  // Admin user
  const adminPasswordHash = await bcrypt.hash("Passw0rd!", SALT_ROUNDS);
  const adminUser = new UserModel({
    name: "Admin",
    email: "admin@example.com",
    password: adminPasswordHash,
    role: UserRoleEnum.ADMIN,
  });
  await adminUser.save();

  // Create users
  const users = await Promise.all(
    Array.from({ length: 3 }).map(async () => {
      const passwordHash = await bcrypt.hash("Passw0rd!", 10);
      return {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: passwordHash,
      };
    })
  );
  const userDocs = await UserModel.insertMany(users, { ordered: false });

  // Create tasks
  const tasks = Array.from({ length: 10 }).map(() => {
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
  const taskDocs = await TaskModel.insertMany(tasks, { ordered: false });

  // Update users with their assigned tasks
  for (const task of taskDocs) {
  if (task.assignedTo) {
    await UserModel.findByIdAndUpdate(task.assignedTo, {
      $push: { tasks: task._id },
    });
  }
}

  const totalUsers = await UserModel.countDocuments();
  const totalTasks = await TaskModel.countDocuments();

  console.log(
    `Seeding completed: ${totalUsers} users (👤 ${adminUser.email} / Passw0rd! is admin), ${totalTasks} tasks.`
  );

  await mongoose.disconnect();
}

seedDatabase().catch((e) => {
  console.error(e);
  process.exit(1);
});
