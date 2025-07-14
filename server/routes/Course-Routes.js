import express from "express";
import multer from "multer";
import { join } from "path";
import {
  courseSchema,
  courseSchemaUpdate,
} from "../validation-rules/courses.rule.js";
import validateMiddleware from "../middlewares/validate.middleware.js";
import deserializeMiddleware from "../middlewares/deserialize.middleware.js";
import CourseDeserializer from "../serializers/course.deserializer.js";
import CoursesController from "../controllers/courses.controller.js";
import "express-async-errors";

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "server/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Routes with middleware chain
router.get("/", CoursesController.getAll);

router.get("/:id", CoursesController.getById);

router.post(
  "/",
  upload.single("image"),
  deserializeMiddleware(CourseDeserializer),
  validateMiddleware(courseSchema),
  CoursesController.create
);

router.put(
  "/:id",
  upload.single("image"),
  deserializeMiddleware(CourseDeserializer),
  validateMiddleware(courseSchemaUpdate),
  CoursesController.update
);

router.delete("/:id", CoursesController.remove);

export default router;
