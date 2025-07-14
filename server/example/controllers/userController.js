const { User, Provider } = require("../db");
const UserSerializer = require("../serializers/user.serializer");

const { createCrudOperations } = require("../utils/crudOperations");

const userCrudOperations = createCrudOperations({
  Model: User,
  modelName: "user",
  Serializer: UserSerializer,
  allowedIncludes: ["provider"],
  allowedFields: [
    "id",
    "first_name",
    "last_name",
    "email",
    "password",
    "role",
    "createdAt",
    "updatedAt",
  ],
  defaultIncludes: [{ model: Provider, as: "provider" }],
  uniqueField: ["email"],
  hasPassword: true,
});

exports.getAll = userCrudOperations.getAllWithPagination;
exports.createUser = userCrudOperations.create;
exports.getUser = userCrudOperations.getOne;
exports.updateUser = userCrudOperations.update;
exports.deleteUser = userCrudOperations.delete;
