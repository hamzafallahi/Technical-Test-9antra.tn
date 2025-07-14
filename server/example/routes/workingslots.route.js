const express = require("express");
const router = express.Router();
const {
  workingSlotSchema,
  workingSlotSchemaUpdate,
} = require("../validation-rules/workingslots.rule");
const validateMiddleware = require("../middlewares/validate.middleware");
const deserializeMiddleware = require("../middlewares/deserialize.middleware");
const WorkingSlotDeserializer = require("../serializers/workingslot.deserializer");
const WorkingSlotsController = require("../controllers/workingslots.controller");

require("express-async-errors");
const cacheMiddleware = require("../middlewares/cache.middleware");
router.use(cacheMiddleware);
// Get all working slots
router.get("/:id/workingslots", WorkingSlotsController.getAll);
// Get all working slots
//router.get("/workingslots", WorkingSlotsController.getAll);
// Get working slot by ID
router.get("/:calendar_id/workingslots/:id", WorkingSlotsController.getById);

// Create working slot (supports recurring slots)
router.post(
  "/:calendar_id/workingslots",
  deserializeMiddleware(WorkingSlotDeserializer),
  validateMiddleware(workingSlotSchema),
  WorkingSlotsController.create
);

// Update working slot (supports updating all recurring instances with ?updateAll=true)
router.patch(
  "/:calendar_id/workingslots/:id",
  deserializeMiddleware(WorkingSlotDeserializer),
  validateMiddleware(workingSlotSchemaUpdate),
  WorkingSlotsController.update
);

// Delete working slot (supports deleting all recurring instances with ?deleteAll=true)
router.delete("/:calendar_id/workingslots/:id", WorkingSlotsController.remove);

module.exports = router;
