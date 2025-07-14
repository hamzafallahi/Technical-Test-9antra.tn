const Joi = require("joi");

const attendeeSchema = Joi.object({
  first_name: Joi.string().max(50).required(),
  last_name: Joi.string().max(50).required(),
  email: Joi.string().email().max(100).required(),
  phone: Joi.string().max(20).optional(),
  appointment_id: Joi.string().uuid().required(),
});

const attendeeSchemaUpdate = Joi.object({
  first_name: Joi.string().max(50).optional(),
  last_name: Joi.string().max(50).optional(),
  email: Joi.string().email().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  appointment_id: Joi.string().uuid().optional(),
});

module.exports = {
  attendeeSchema,
  attendeeSchemaUpdate,
};
