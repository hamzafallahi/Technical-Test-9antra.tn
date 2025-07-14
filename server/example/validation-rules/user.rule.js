const Joi = require("joi");

exports.createUserSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  first_name: Joi.string().trim().required().messages({
    "string.empty": "First name cannot be empty",
    "any.required": "First name is required",
  }),
  last_name: Joi.string().trim().required().messages({
    "string.empty": "Last name cannot be empty",
    "any.required": "Last name is required",
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Please enter a valid email",
    "any.required": "Email is required",
  }),
  password: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      "any.required": "Password is required",
    }),
  role: Joi.string().valid("provider", "assistant").required().messages({
    "any.only": "Role must be either provider or assistant",
    "any.required": "Role is required",
  }),
});

exports.updateUserSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  first_name: Joi.string().trim(),
  last_name: Joi.string().trim(),
  email: Joi.string().email().lowercase(),
  password: Joi.string().min(8),
  role: Joi.string().valid("provider", "assistant"),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });
