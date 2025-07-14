import { Course } from "../models/Course.js";
import CourseSerializer from "../serializers/course.serializer.js";
import { createCrudOperations } from "../utils/crudOperations.js";
import NotFoundError from "../error/exception/NotFound.js";

const allowedFields = [
  "id",
  "title",
  "description",
  "price",
  "imageUrl",
  "createdAt",
  "updatedAt",
];

const crudOps = createCrudOperations({
  Model: Course,
  modelName: "Course",
  Serializer: CourseSerializer,
  allowedIncludes: [],
  allowedFields,
  defaultIncludes: [],
});

// Custom getAll with image URL handling
const getAll = async (req, res, next) => {
  try {
    // Call the CRUD operation
    await crudOps.getAllWithPagination(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      throw new NotFoundError("Course not found", "Course");
    }

    let serializedData = CourseSerializer.serialize(course);
    res.json(serializedData);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    // Handle file upload
    if (req.file) {
      req.body.imageUrl = req.file.filename;
    }

    const newCourse = await Course.create(req.body);
    let serializedData = CourseSerializer.serialize(newCourse);
    res.status(201).json(serializedData);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      throw new NotFoundError("Course not found", "Course");
    }

    // Handle file upload
    if (req.file) {
      req.body.imageUrl = req.file.filename;
    }

    await course.update(req.body);
    let serializedData = CourseSerializer.serialize(course);
    res.json(serializedData);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);

    if (!course) {
      throw new NotFoundError("Course not found", "Course");
    }

    await course.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
};
