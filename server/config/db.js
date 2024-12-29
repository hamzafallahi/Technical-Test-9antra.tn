import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/9antra-platform");
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database connection failed", error);
  }
};

export default connectDB;
