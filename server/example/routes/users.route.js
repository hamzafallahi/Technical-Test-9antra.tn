const express = require("express");
const UserRouter = express.Router();
const userController = require("../controllers/userController");
//const { validate } = require('../middleware/validationMiddleware');
const validateMiddleware = require("../middlewares/validate.middleware");
//const deserializeMiddleware = require('../middleware/deserializeMiddleware');
//const UserDeserializer = require('../deserializers/userDeserializer');
const deserializeMiddleware = require("../middlewares/deserialize.middleware");
const {
  createUserSchema,
  updateUserSchema,
} = require("../validation-rules/user.rule");
const UserDeserializer = require("../serializers/user.deserializer");
const cacheMiddleware = require('../middlewares/cache.middleware');
UserRouter.use(cacheMiddleware)
// Route to fetch all users
UserRouter.get("/", userController.getAll);
// Route to create a new user
UserRouter.post(
  "/",
  deserializeMiddleware(UserDeserializer),
  validateMiddleware(createUserSchema),
  userController.createUser
);
// Route to fetch a specific user by ID
UserRouter.get("/:user_id", userController.getUser);
// Route to update a specific user by ID
UserRouter.patch(
  "/:user_id",
  deserializeMiddleware(UserDeserializer),
  validateMiddleware(updateUserSchema),
  userController.updateUser
);
// Route to delete a specific user by ID
UserRouter.delete("/:user_id", userController.deleteUser);

module.exports = UserRouter;
