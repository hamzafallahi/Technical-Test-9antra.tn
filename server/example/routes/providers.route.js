const express = require("express");
const ProviderRouter = express.Router();
const providerController = require("../controllers/providerController");
//const { validateMiddleware } = require("../middlewares/validateMiddleware.middleware");
//const validateMiddleware = require("../middlewares/validateMiddleware.middleware");
const validateMiddleware = require("../middlewares/validate.middleware");

const {
  createProviderSchema,
  updateProviderSchema,
} = require("../validation-rules/provider.rule");
const ProviderDeserializer = require("../serializers/provider.deserializer");
const deserializeMiddleware = require("../middlewares/deserialize.middleware");
// Base provider routes
const cacheMiddleware = require('../middlewares/cache.middleware');
ProviderRouter.use(cacheMiddleware)
ProviderRouter.get("/", providerController.getAll);
ProviderRouter.post(
  "/",
  deserializeMiddleware(ProviderDeserializer),
  validateMiddleware(createProviderSchema),
  providerController.createProvider
);
ProviderRouter.get("/:provider_id", providerController.getProvider);
ProviderRouter.patch(
  "/:provider_id",
  deserializeMiddleware(ProviderDeserializer),
  validateMiddleware(updateProviderSchema),
  providerController.updateProvider
);
ProviderRouter.delete("/:provider_id", providerController.deleteProvider);

module.exports = ProviderRouter;
