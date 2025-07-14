import express from "express";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import connectDB from "./config/db.js";
import contactRoutes from "./routes/Contact-Routes.js";
import courseRoutes from "./routes/Course-Routes.js";
import { errorHandler } from "./error/handler/errorHandler.js";
import "express-async-errors";

dotenv.config();

// Get __filename and __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const _PORT = process.env.PORT || 3000;

// Connect to PostgreSQL
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  exposedHeaders: ['Content-Length', 'Content-Disposition']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/contactus", contactRoutes);
app.use("/api/courses", courseRoutes);

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(_PORT, () => {
  console.log(`Server running on port ${_PORT}`);
});
