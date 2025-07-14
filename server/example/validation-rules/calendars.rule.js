const Joi = require("joi");

const calendarSchema = Joi.object({
  provider_id: Joi.string().uuid().required(), // UUID validation
  name: Joi.string().max(30).required(), // Updated field name
  description: Joi.string().max(255).optional(),
  timezone: Joi.string().max(255).required(),
  queuing_system: Joi.boolean().default(false),
  meeting_tool_id: Joi.string().uuid().optional().allow(null), // UUID validation
  //booking_page: Joi.string().max(255).optional(), // New field
  duration: Joi.string().default("00:30:00").required(),
  color: Joi.string()
    .valid(
      "RED",
      "GREEN",
      "BLUE",
      "YELLOW",
      "PURPLE",
      "ORANGE",
      "BLACK",
      "WHITE",
      "PINK",
      "BROWN",
      "GRAY",
      "CYAN"
    )
    .optional(), // Enum validation
  slug: Joi.string().max(255).optional(),
});
const calendarSchemaUpdate = Joi.object({
  provider_id: Joi.string().uuid().optional(), // UUID validation
  name: Joi.string().max(30).optional(), // Updated field name
  description: Joi.string().max(255).optional(),
  timezone: Joi.string().max(255).optional(),
  queuing_system: Joi.boolean().default(false).optional(),
  meeting_tool_id: Joi.string().uuid().optional().allow(null), // UUID validation
  //booking_page: Joi.string().max(255).optional(), // New field
  duration: Joi.string().default("00:30:00").optional(),
  color: Joi.string()
    .valid(
      "RED",
      "GREEN",
      "BLUE",
      "YELLOW",
      "PURPLE",
      "ORANGE",
      "BLACK",
      "WHITE",
      "PINK",
      "BROWN",
      "GRAY",
      "CYAN"
    )
    .optional(), // Enum validation
  slug: Joi.string().max(255).optional(),
});

//module.exports = calendarSchema;
module.exports = {
  calendarSchema,
  calendarSchemaUpdate,
};
