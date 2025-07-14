const Joi = require("joi");

// Define the attendee schema that will be used within appointments
const attendeeSchema = Joi.object({
  first_name: Joi.string().max(50).optional(),
  last_name: Joi.string().max(50).optional(),
  email: Joi.string().email().max(100).required(),
  phone: Joi.string().max(20).optional(),
});

const appointmentSchema = Joi.object({
  calendar_id: Joi.string().uuid().optional(),
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  meeting_link: Joi.string().max(255).optional(),
  start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/) // Validate time format (HH:MM:SS)
    .required(),
  end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/) // Validate time format (HH:MM:SS)
    .required()
    .custom((value, helpers) => {
      const startTime = helpers.state.ancestors[0].start_time;
      if (value <= startTime) {
        return helpers.error("any.invalid", {
          message: "end_time must be greater than start_time",
        });
      }
      //iizjeiaejzai
      return value;
    }),
  status: Joi.string()
    .valid("pending", "confirmed", "canceled", "completed")
    .required(),
  date: Joi.date().default(() => new Date()),
  google_calendar_id: Joi.string().max(255).optional(), // ID of the Google Calendar to use
  // Add the attendees field to validate multiple attendees
  attendees: Joi.array().items(attendeeSchema).min(1),
});

const appointmentSchemaUpdate = Joi.object({
  calendar_id: Joi.string().uuid().optional(),
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  meeting_link: Joi.string().max(255).optional(),
  start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/) // Validate time format (HH:MM:SS)
    .optional(),
  end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/) // Validate time format (HH:MM:SS)
    .optional()
    .custom((value, helpers) => {
      const startTime = helpers.state.ancestors[0].start_time;
      if (value && startTime && value <= startTime) {
        return helpers.error("any.invalid", {
          message: "end_time must be greater than start_time",
        });
      }
      return value;
    }),
  status: Joi.string()
    .valid("pending", "confirmed", "canceled", "completed")
    .optional(),
  date: Joi.date().optional(),
  google_calendar_id: Joi.string().max(255).optional(), // ID of the Google Calendar to use
  // Make attendees optional for updates
  attendees: Joi.array().items(attendeeSchema).min(1).optional(),
});

module.exports = {
  appointmentSchema,
  appointmentSchemaUpdate,
};
