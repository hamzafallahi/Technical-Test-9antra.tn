import express from "express";
import dotenv from "dotenv";
import { join } from "path";
import { fileURLToPath } from "url"; // Import fileURLToPath
import cors from "cors";
import connectDB from "./config/db.js";
import contactRoutes from "./routes/Contact-Routes.js";
import courseRoutes from "./routes/Course-Routes.js";

dotenv.config();

// Get __filename and __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const app = express();
const _PORT = process.env.PORT || 3000; // Provide a default port

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/contactus", contactRoutes);
app.use("/api/courses", courseRoutes);

// Start server
app.listen(_PORT, () => {
  console.log(`Server running on port ${_PORT}`);
});
