const Joi = require("joi");

exports.createProviderSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  user_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
    "string.guid": "User ID must be a valid UUID v4",
    "any.required": "User ID is required",
  }),
  business_name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Business name cannot be empty",
    "string.min": "Business name must be at least 2 characters long",
    "string.max": "Business name cannot exceed 100 characters",
    "any.required": "Business name is required",
  }),
  category: Joi.string().trim().max(50).required().messages({
    "any.only": "category must be string",
    "any.required": "Category is required",
  }),
  slug: Joi.string().trim().max(50).allow("").optional().messages({
    "string.max": "Slug cannot exceed 50 characters",
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Phone number must be in E.164 format",
    }),
  landline: Joi.string().trim().allow("").optional(),
  avatar: Joi.string().uri().allow("").optional(),
  about: Joi.string().trim().allow("").optional(),
});

exports.updateProviderSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  user_id: Joi.string().guid({ version: "uuidv4" }),
  business_name: Joi.string().trim(),
  category: Joi.string().trim(),
  slug: Joi.string().trim().max(50).allow(""),
  phone: Joi.string().trim().allow(""),
  landline: Joi.string().trim().allow(""),
  avatar: Joi.string().uri().allow(""),
  about: Joi.string().trim().allow("").optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });
