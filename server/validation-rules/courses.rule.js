import Joi from "joi";

const courseSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 1 character long",
    "string.max": "Title must not exceed 255 characters",
    "any.required": "Title is required",
  }),
  description: Joi.string().min(1).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 1 character long",
    "any.required": "Description is required",
  }),
  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number",
    "number.min": "Price must be greater than or equal to 0",
    "any.required": "Price is required",
  }),
  imageUrl: Joi.string().optional().allow(null, ""),
});

const courseSchemaUpdate = Joi.object({
  title: Joi.string().min(1).max(255).optional().messages({
    "string.empty": "Title cannot be empty",
    "string.min": "Title must be at least 1 character long",
    "string.max": "Title must not exceed 255 characters",
  }),
  description: Joi.string().min(1).optional().messages({
    "string.empty": "Description cannot be empty",
    "string.min": "Description must be at least 1 character long",
  }),
  price: Joi.number().min(0).optional().messages({
    "number.base": "Price must be a number",
    "number.min": "Price must be greater than or equal to 0",
  }),
  imageUrl: Joi.string().optional().allow(null, ""),
});

export { courseSchema, courseSchemaUpdate };
