const mongoose = require("mongoose");
const db = require("../config/db");

describe("Database connection", () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("should connect to MongoDB successfully", async () => {
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/social_test";

    await expect(db.connect()).resolves.toBeUndefined();
    expect(mongoose.connection.readyState).toBe(1);
  });
});
