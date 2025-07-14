const express = require("express");
const router = express.Router();
const {
  appointmentSchema,
  appointmentSchemaUpdate,
} = require("../validation-rules/appointments.rule");
const validateMiddleware = require("../middlewares/validate.middleware");
const deserializeMiddleware = require("../middlewares/deserialize.middleware");

const AppointmentDeserializer = require("../serializers/appointment.deserializer");
const AppointmentsController = require("../controllers/appointments.controller");
const cacheMiddleware = require("../middlewares/cache.middleware");
require("express-async-errors");

router.use(cacheMiddleware)
router.get("/:id/appointments", AppointmentsController.getAll);
router.get("/:calendar_id/appointments/:id", AppointmentsController.getById);

router.post(
  "/:calendar_id/appointments",
  deserializeMiddleware(AppointmentDeserializer),
  validateMiddleware(appointmentSchema),
  AppointmentsController.create
);
router.patch(
  "/:calendar_id/appointments/:id/reschedule",
  deserializeMiddleware(AppointmentDeserializer),
  validateMiddleware(appointmentSchemaUpdate),
  AppointmentsController.update
);
router.delete(
  "/:calendar_id/appointments/:id/cancel",

  AppointmentsController.remove
);

module.exports = router;
