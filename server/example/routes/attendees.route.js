const express = require("express");
const router = express.Router();
const {
  attendeeSchema,
  attendeeSchemaUpdate,
} = require("../validation-rules/attendees.rule");
const validateMiddleware = require("../middlewares/validate.middleware");
const deserializeMiddleware = require("../middlewares/deserialize.middleware");
const AttendeeDeserializer = require("../serializers/attendee.deserializer");
const AttendeesController = require("../controllers/attendees.controller");
const cacheMiddleware = require("../middlewares/cache.middleware");
require("express-async-errors");
router.use(cacheMiddleware)
router.get(
  "/:calendar_id/appointments/:appointment_id/attendees",

  AttendeesController.getAll
);
router.get(
  "/:calendar_id/appointments/:appointment_id/attendees/:id",

  AttendeesController.getById
);
router.post(
  "/:calendar_id/appointments/:appointment_id/attendees",
  deserializeMiddleware(AttendeeDeserializer),
  validateMiddleware(attendeeSchema),
  AttendeesController.create
);
router.patch(
  "/:calendar_id/appointments/:appointment_id/attendees/:id",
  deserializeMiddleware(AttendeeDeserializer),
  validateMiddleware(attendeeSchemaUpdate),
  AttendeesController.update
);
router.delete(
  "/:calendar_id/appointments/:appointment_id/attendees/:id",
  AttendeesController.remove
);

module.exports = router;
