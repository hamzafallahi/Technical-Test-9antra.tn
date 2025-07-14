const Joi = require("joi");

// Helper function to compare time strings
const isTimeAfter = (time1, time2) => {
  const [h1, m1, s1] = time1.split(":").map(Number);
  const [h2, m2, s2] = time2.split(":").map(Number);
  return (
    h1 > h2 || (h1 === h2 && m1 > m2) || (h1 === h2 && m1 === m2 && s1 > s2)
  );
};

const workingSlotSchema = Joi.object({
  calendar_id: Joi.string().uuid().optional(),
  day_of_week: Joi.string()
    .valid(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    )
    .required(),
  start_time: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .required(),
  end_time: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .required()    .custom((value, helpers) => {
      const { start_time } = helpers.state.ancestors[0];
      if (!isTimeAfter(value, start_time)) {
        return helpers.error("any.invalid", { value });
      }
      return value;
    }, "End time must be after start time"),
  duration: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  break_start: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  break_end: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional()
    .custom((value, helpers) => {
      const { break_start } = helpers.state.ancestors[0];
      if (break_start && !isTimeAfter(value, break_start)) {
        return helpers.error("any.invalid", { value });
      }
      return value;
    }, "Break end time must be after break start time"),
  creation_date: Joi.optional(),
});

const workingSlotSchemaUpdate = Joi.object({
  calendar_id: Joi.string().uuid().optional(),
  day_of_week: Joi.string()
    .valid(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    )
    .optional(),
  start_time: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  end_time: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional()    .custom((value, helpers) => {
      const { start_time } = helpers.state.ancestors[0];
      if (start_time && !isTimeAfter(value, start_time)) {
        return helpers.error("any.invalid", { value });
      }
      return value;
    }, "End time must be after start time"),
  duration: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  break_start: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  break_end: Joi.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional()
    .custom((value, helpers) => {
      const { break_start } = helpers.state.ancestors[0];
      if (break_start && !isTimeAfter(value, break_start)) {
        return helpers.error("any.invalid", { value });
      }
      return value;
    }, "Break end time must be after break start time"),
  creation_date: Joi.optional(),
});

module.exports = {
  workingSlotSchema,
  workingSlotSchemaUpdate,
};
