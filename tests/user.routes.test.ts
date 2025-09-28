import app from "../src/server";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { authSchema, createUserSchema, updateUserSchema } from "../src/schemas/user.schema";
import { UserModel, UserRoleEnum } from "../src/models/user.model";
import { createJWT } from "../src/utils/jwt.utils";


let USER_TOKEN: string;
let USER_ID: string;
let ADMIN_TOKEN: string;
let ADMIN_ID: string;

const TEST_EMAIL = "test_user@test.com";
const ADMIN_EMAIL = "admin_user@test.com";
const TEST_PASSWORD = "PassW0rd!";
let HASHED_PASSWORD: string;

// Increase Jest timeout to 30s to allow for DB operations and network delays
jest.setTimeout(30000);
mongoose.set('debug', false);

beforeAll(async () => {
  const MONGODB_URI = process.env.MONGODB_URI!;
  const DB_NAME = process.env.DB_NAME!;
  HASHED_PASSWORD = await bcrypt.hash(TEST_PASSWORD, 10);
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

  const parsedUser = createUserSchema.parse({
    name: "Test User",
    email: TEST_EMAIL,
    password: HASHED_PASSWORD
  });

  const parsedAdmin = createUserSchema.parse({
    name: "Admin User",
    email: ADMIN_EMAIL,
    password: HASHED_PASSWORD
  });

  // Create a test user directly in DB for login & token
  const user = await UserModel.create(parsedUser);
  USER_ID = user._id.toString();
  USER_TOKEN = createJWT(user);

  // Create an admin user for admin-only tests
  const admin = await UserModel.create({
    ...parsedAdmin,
    role: UserRoleEnum.ADMIN
  });
  ADMIN_ID = admin._id.toString();
  ADMIN_TOKEN = createJWT(admin);
});

afterAll(async () => {
  await UserModel.deleteMany({
    email: { $in: [TEST_EMAIL, ADMIN_EMAIL, "new_user@test.com", "temp_user@test.com"] }
  });
  await mongoose.connection.close();
});

describe("User routes", () => {
  it("should create a new user", async () => {
    const newUser = { name: "New User", email: "new_user@test.com", password: HASHED_PASSWORD };

    // Pre-validate input with Zod schema
    createUserSchema.parse(newUser);

    const res = await request(app)
      .post("/api/users/signup")
      .send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("should not allow duplicate email", async () => {
    const res = await request(app)
      .post("/api/users/signup")
      .send({ name: "Duplicate User", email: TEST_EMAIL, password: HASHED_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  it("should login an existing user", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should not login with wrong password", async () => {
    const res = await request(app)
      .post("/api/users/login")
      // Correct zod validation but wrong password
      .send({ email: TEST_EMAIL, password: "Wrong_Pass!" });

    expect(res.status).toBe(401);
  });

  it("should get user info with valid token", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", USER_ID);
  });

  it("should update user info", async () => {
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("name", "Updated Name");
  });

  it("should delete user", async () => {
    // Create a temporary user to delete
    const tempUser = await UserModel.create({
      name: "Temp User",
      email: "temp_user@test.com",
      password: HASHED_PASSWORD,
      role: UserRoleEnum.USER
    });

    const tempToken = createJWT(tempUser);

    const res = await request(app)
      .delete(`/api/users/${tempUser._id}`)
      .set("Authorization", `Bearer ${tempToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "User deleted successfully");

    // Confirm user is removed from DB
    const deleted = await UserModel.findById(tempUser._id);
    expect(deleted).toBeNull();
  });

  it("should reset password using token", async () => {
    const resetToken = "test-reset-token";

    // Save token and expiry on user
    await UserModel.findByIdAndUpdate(USER_ID, {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 min from now
    });

    // Pre-validate new password with Zod schema
    const newPassword = "87654321!";
    createUserSchema.parse({ name: "Reset", email: TEST_EMAIL, password: newPassword });

    const res = await request(app)
      .put(`/api/users/reset-password/${resetToken}`)
      .send({ newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Password has been reset successfully.");

    // Confirm password is updated
    const updatedUser = await UserModel.findById(USER_ID);
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.resetToken).toBeNull();
    expect(updatedUser?.resetTokenExpiry).toBeNull();
  });

  it("should allow admin to get all users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);

    // Check that passwords are not included in response
    res.body.users.forEach((user: any) => {
      expect(user).not.toHaveProperty("password");
      expect(user).toHaveProperty("_id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("email");
    });
  });

  it("should not allow regular user to get all users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${USER_TOKEN}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Forbidden: Admins only");
  });

  it("should not allow unauthenticated access to get all users", async () => {
    const res = await request(app)
      .get("/api/users");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message", "Unauthorized request. Missing or invalid token.");
  });
});

describe("Password validation with Zod schema", () => {
  it("should fail if password is too short", () => {
    const input = { email: "test@example.com", password: "Ab1!" };
    expect(() => authSchema.parse(input)).toThrow(/at least 8 characters/);
  });

  it("should fail if password has no special character", () => {
    const input = { email: "test@example.com", password: "Abcdefgh1" };
    expect(() => authSchema.parse(input)).toThrow(/special character/);
  });

  it("should pass with valid password", () => {
    const input = { email: "test@example.com", password: "Abcd!1234" };
    const result = authSchema.parse(input);
    expect(result.password).toBe("Abcd!1234");
  });

  it("should fail if name is too short in createUserSchema", () => {
    const input = { name: "Al", email: "test@example.com", password: "Abcd!1234" };
    expect(() => createUserSchema.parse(input)).toThrow(/at least 3 characters/);
  });

  it("should pass with valid createUserSchema input", () => {
    const input = { name: "Alice", email: "test@example.com", password: "Abcd!1234" };
    const result = createUserSchema.parse(input);
    expect(result.name).toBe("Alice");
  });

  it("updateUserSchema allows partial input", () => {
    const input = { name: "Bob" }; // only name
    const result = updateUserSchema.parse(input);
    expect(result.name).toBe("Bob");
    expect(result.password).toBeUndefined();
  });
});
