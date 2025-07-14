const express = require("express");
const router = express.Router();
const {
  calendarSchema,
  calendarSchemaUpdate,
} = require("../validation-rules/calendars.rule");
const validateMiddleware = require("../middlewares/validate.middleware");
const deserializeMiddleware = require("../middlewares/deserialize.middleware");
const CalendarDeserializer = require("../serializers/calendar.deserializer");
const CalendarsController = require("../controllers/calendars.controller");
const cacheMiddleware = require('../middlewares/cache.middleware');
require("express-async-errors");
router.use(cacheMiddleware)
router.get("/", CalendarsController.getAll);
router.get("/:id", CalendarsController.getById);
router.post(
  "/",
  deserializeMiddleware(CalendarDeserializer),
  validateMiddleware(calendarSchema),
  CalendarsController.create
);
router.delete("/:id", CalendarsController.remove);
router.patch(
  "/:id",
  deserializeMiddleware(CalendarDeserializer),
  validateMiddleware(calendarSchemaUpdate),
  CalendarsController.update
);

module.exports = router;
