import mongoose from "mongoose";
import app from "../src/server";
import request from "supertest";
import { TaskModel, TaskStatusEnum } from "../src/models/task.model";
import { UserModel, UserRoleEnum } from "../src/models/user.model";
import { createJWT } from "../src/utils/jwt.utils";

let USER_ID: string;
let ADMIN_ID: string;
let USER_TOKEN: string;
let ADMIN_TOKEN: string;

const ADMIN_EMAIL = "admin.routes@test.com";
const USER_EMAIL = "user.routes@test.com";
const TEST_PASSWORD = "PassW0rd!";

// Increase Jest timeout to 30s to allow for DB operations and network delays
jest.setTimeout(30000);
mongoose.set('debug', false);

beforeAll(async () => {
  const MONGODB_URI = process.env.MONGODB_URI!;
  const DB_NAME = process.env.DB_NAME!;
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

  // Create regular user
  const user = await UserModel.create({
    name: "Test User",
    email: USER_EMAIL,
    password: TEST_PASSWORD,
    role: UserRoleEnum.USER
  });
  USER_ID = user._id.toString();
  USER_TOKEN = createJWT(user);

  // Create admin user
  const admin = await UserModel.create({
    name: "Admin User",
    email: ADMIN_EMAIL,
    password: TEST_PASSWORD,
    role: UserRoleEnum.ADMIN
  });
  ADMIN_ID = admin._id.toString();
  ADMIN_TOKEN = createJWT(admin);
});

afterAll(async () => {
  // Remove test data
  await TaskModel.deleteMany({ title: /^Test Task$/i });
  await UserModel.deleteMany({ email: { $in: [USER_EMAIL, ADMIN_EMAIL] } });
  await mongoose.connection.close();
});

describe("Task API full coverage with one user + admin", () => {
  let taskId: string;

  beforeEach(async () => {
    // Create a new task before each test
    const task = await TaskModel.create({
      title: "Test Task",
      description: "Task for testing",
      assignedTo: USER_ID
    });
    taskId = task._id.toString();
  });

  afterEach(async () => {
    // Clean up tasks after each test
    await TaskModel.deleteMany({ title: /Test Task/i });
  });

  it("should create a task successfully", async () => {
    // Test creating a valid task
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ title: "Test Task", description: "Task for testing", assignedTo: USER_ID });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe("Test Task");
    taskId = res.body.task._id.toString();
  });

  it("should fail to create a task without title", async () => {
    // Test validation: title is required
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ description: "No title task" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Title is required/);
  });

  it("should fail to create a task with non-existing assignedTo", async () => {
    // Test assigning task to a user that doesn't exist
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ title: "Invalid assign", assignedTo: new mongoose.Types.ObjectId() });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Assigned user not found/);
  });

  it("should fetch tasks for user", async () => {
    // Test fetching tasks for logged-in user
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThan(0);
    expect(res.body.tasks[0].assignedTo._id.toString()).toBe(USER_ID);
  });

  it("should fetch task by ID", async () => {
    // Test fetching a single task by ID
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.task.assignedTo._id.toString()).toBe(USER_ID);
  });

  it("should return 403 when user tries to fetch task assigned to admin", async () => {
    // Admin creates task assigned to themselves
    const adminTask = await TaskModel.create({ title: "Admin Task", assignedTo: ADMIN_ID });

    const res = await request(app)
      .get(`/api/tasks/${adminTask._id}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
    await TaskModel.findByIdAndDelete(adminTask._id);
  });

  it("should return 404 for non-existing task", async () => {
    // Test fetching a task that doesn't exist
    const res = await request(app)
      .get(`/api/tasks/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it("should update task status to DONE", async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ status: TaskStatusEnum.DONE });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe(TaskStatusEnum.DONE);
    expect(res.body.task.finishedBy._id.toString()).toBe(USER_ID);
  });

  it("should return 400 when updating task with invalid status", async () => {
    const res = await request(app)
    .put(`/api/tasks/${taskId}`)
    .set("Authorization", `Bearer ${USER_TOKEN}`)
    .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status/);
  });

  it("should return 404 if assignedTo does not exist on update", async () => {
    // Test updating assignedTo to a non-existing user
    const res = await request(app)
    .patch(`/api/tasks/${taskId}`)
    .set("Authorization", `Bearer ${USER_TOKEN}`)
    .send({ assignedTo: new mongoose.Types.ObjectId() });

    expect(res.status).toBe(404);
  });

  it("should allow updating assignedTo to another existing user", async () => {
    // Test updating assignedTo to another valid user
    const newUser = await UserModel.create({
      name: "New User",
      email: "newuser@test.com",
      password: TEST_PASSWORD,
      role: UserRoleEnum.USER
    });

    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ assignedTo: newUser._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.task.assignedTo._id.toString()).toBe(newUser._id.toString());

    await UserModel.findByIdAndDelete(newUser._id);
  });

  it("should delete task successfully", async () => {
    // Test deleting a task
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    const deleted = await TaskModel.findById(taskId);
    expect(deleted).toBeNull();
  });

  it("should return 403 when deleting task not assigned to user", async () => {
    const adminTask = await TaskModel.create({ title: "Admin Task", assignedTo: ADMIN_ID });

    const res = await request(app)
      .delete(`/api/tasks/${adminTask._id}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
    await TaskModel.findByIdAndDelete(adminTask._id);
  });

  it("should return 404 when deleting non-existing task", async () => {
    // Test deleting a task that is already deleted
    const res = await request(app)
      .delete(`/api/tasks/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(404);
  });
});

describe("Task API admin-specific tests", () => {
  let adminTaskId: string;

  beforeAll(async () => {
    // Admin creates a task assigned to the user
    const adminTask = await TaskModel.create({ title: "Admin Own Task", assignedTo: USER_ID });
    adminTaskId = adminTask._id.toString();
  });

  afterAll(async () => {
    await TaskModel.deleteMany({ title: /Admin Own Task/i });
  });

  it("admin can fetch task assigned to any user", async () => {
    const res = await request(app)
      .get(`/api/tasks/${adminTaskId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.task._id).toBe(adminTaskId);
    // Verify assignedTo is populated correctly
    expect(res.body.task.assignedTo._id.toString()).toBe(USER_ID);
  });

  it("admin can update task assigned to any user", async () => {
    const res = await request(app)
      .put(`/api/tasks/${adminTaskId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ status: TaskStatusEnum.DONE });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe(TaskStatusEnum.DONE);
    expect(res.body.task.finishedBy._id.toString()).toBe(ADMIN_ID);
    // Verify assignedTo is still correct
    expect(res.body.task.assignedTo._id.toString()).toBe(USER_ID);
  });

  it("admin can delete task assigned to any user", async () => {
    const res = await request(app)
      .delete(`/api/tasks/${adminTaskId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    const deleted = await TaskModel.findById(adminTaskId);
    expect(deleted).toBeNull();
  });
});
