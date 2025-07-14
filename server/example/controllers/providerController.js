const { Provider, User, Calendar, MeetingTool } = require("../db");
const ProviderSerializer = require("../serializers/provider.serializer");
//const ProviderDeserializer = require("../deserializers/providerDeserializer");
const { createCrudOperations } = require("../utils/crudOperations");

const providerCrudOperations = createCrudOperations({
  Model: Provider,
  modelName: "provider",
  Serializer: ProviderSerializer,
  allowedIncludes: ["user", "Calendar", "MeetingTool"],
  allowedFields: [
    "id",
    "user_id",
    "business_name",
    "category",
    "slug",
    "phone",
    "landline",
    "avatar",
    "about",
    "createdAt",
    "updatedAt",
  ],
  defaultIncludes: [
    { model: User, as: "user" },
    { model: Calendar, as: "Calendar" },
    { model: MeetingTool, as: "MeetingTool" },
  ],
  uniqueField: ["user_id", "slug"],
});

exports.getAll = providerCrudOperations.getAllWithPagination;

exports.createProvider = providerCrudOperations.create;
exports.getProvider = providerCrudOperations.getOne;
exports.updateProvider = providerCrudOperations.update;
exports.deleteProvider = providerCrudOperations.delete;
