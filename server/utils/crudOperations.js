import BusinessError from "../error/BusinessError.js";
import NotFoundError from "../error/exception/NotFound.js";
import { Op } from "sequelize";

const config = {
  limit: 10,
};

// Utility function to remove null or empty values and empty relationships
const removeEmpty = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmpty(obj[key]);
      if (key === "relationships") {
        Object.keys(obj[key]).forEach((relKey) => {
          if (
            obj[key][relKey].data == null ||
            (Array.isArray(obj[key][relKey].data) &&
              obj[key][relKey].data.length === 0)
          ) {
            delete obj[key][relKey];
          }
        });
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    } else if (obj[key] == null || obj[key] === "") {
      delete obj[key];
    }
  });
  return obj;
};

const processFilters = (filterParams, allowedFields) => {
  const whereConditions = {};
  const errors = [];

  const operatorMap = {
    eq: Op.eq,
    ne: Op.ne,
    gt: Op.gt,
    gte: Op.gte,
    lt: Op.lt,
    lte: Op.lte,
    in: Op.in,
    nin: Op.notIn,
    contains: Op.like,
    startsWith: Op.startsWith,
    endsWith: Op.endsWith,
  };

  for (const [key, value] of Object.entries(filterParams)) {
    if (!allowedFields.includes(key)) {
      errors.push(
        `Filter parameter "${key}" is not a valid field. Allowed values: ${allowedFields.join(
          ", "
        )}`
      );
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      whereConditions[key] = processOperatorObject(value, operatorMap);
    } else {
      whereConditions[key] = processDirectValue(value);
    }
  }

  return { whereConditions, errors };
};

const processDirectValue = (value) => {
  if (value === "null") {
    return null;
  }

  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  if (typeof value === "string" && value.includes(",")) {
    return { [Op.in]: value.split(",") };
  }

  return value;
};

const processOperatorObject = (opObject, operatorMap) => {
  const condition = {};

  for (const [op, val] of Object.entries(opObject)) {
    if (!operatorMap[op]) {
      throw new Error(`Unsupported operator: ${op}`);
    }

    if (op === "contains") {
      condition[operatorMap[op]] = `%${val}%`;
    } else if (op === "startsWith") {
      condition[operatorMap[op]] = `${val}%`;
    } else if (op === "endsWith") {
      condition[operatorMap[op]] = `%${val}`;
    } else if (op === "in" || op === "nin") {
      condition[operatorMap[op]] =
        typeof val === "string" ? val.split(",") : val;
    } else if (val === "null") {
      if (op === "eq") {
        condition[Op.is] = null;
      } else if (op === "ne") {
        condition[Op.not] = null;
      } else {
        condition[operatorMap[op]] = val;
      }
    } else {
      condition[operatorMap[op]] = val;
    }
  }

  return condition;
};

export const createCrudOperations = ({
  Model,
  modelName,
  Serializer,
  allowedIncludes = [],
  allowedFields = [],
  defaultIncludes = [],
  uniqueField = null,
  parentIdField = null,
}) => ({
  getAllWithPagination: async (req, res, next) => {
    try {
      let whereCondition = {};
      let include = [];
      const businessError = new BusinessError(
        400,
        "BAD_REQUEST",
        "Validation error"
      );

      // Add parent ID filter if specified
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }

      const pageSize = req.query["page"]?.["size"]
        ? parseInt(req.query["page"]["size"], 10)
        : config.limit;
      const pageNumber = req.query["page"]?.["number"]
        ? parseInt(req.query["page"]["number"], 10)
        : 0;

      if (
        isNaN(pageSize) ||
        isNaN(pageNumber) ||
        pageSize < 1 ||
        pageNumber < 0
      ) {
        businessError.addError(
          "page",
          "Page size must be greater than 0 and page number must be non-negative"
        );
      }
      const offset = pageNumber * pageSize;

      // Handle includes
      if (req.query.include && allowedIncludes.length > 0) {
        const requestedIncludes = req.query.include.split(",");
        requestedIncludes.forEach((relation) => {
          if (!allowedIncludes.includes(relation)) {
            businessError.addError(
              "include",
              `Invalid include parameter: ${relation}. Allowed values: ${allowedIncludes.join(
                ", "
              )}`
            );
          }
        });
      }

      // Handle field selection
      let attributes = undefined;
      if (req.query.fields) {
        let fieldsArray = req.query.fields.split(",");

        const invalidFields = fieldsArray.filter(
          (field) => !allowedFields.includes(field)
        );
        if (invalidFields.length > 0) {
          businessError.addError(
            "fields",
            `Invalid fields requested: ${invalidFields.join(
              ", "
            )}. Allowed fields: ${allowedFields.join(", ")}`
          );
        } else {
          attributes = fieldsArray;
        }
        if (include.length > 0 || attributes) {
          if (attributes) {
            if (!attributes.includes("createdAt")) attributes.push("createdAt");
            if (!attributes.includes("updatedAt")) attributes.push("updatedAt");
            if (!attributes.includes("id")) attributes.push("id");
          }
        }
      }

      // Handle sorting
      let order = [];
      if (req.query.sort) {
        const sortFields = req.query.sort.split(",");
        const invalidSortFields = sortFields.filter(
          (field) => !allowedFields.includes(field.replace("-", ""))
        );

        if (invalidSortFields.length > 0) {
          businessError.addError(
            "fields",
            `Invalid sort fields requested: ${invalidSortFields.join(
              ", "
            )}. Allowed sort fields: ${allowedFields.join(", ")}`
          );
        } else {
          sortFields.forEach((field) => {
            const sortOrder = field.startsWith("-") ? "DESC" : "ASC";
            const sortField = field.replace("-", "");
            order.push([sortField, sortOrder]);

            if (attributes && !attributes.includes(sortField)) {
              attributes.push(sortField);
            }
          });
        }
      } else {
        order.push(["createdAt", "DESC"]);
      }

      // Handle filtering
      if (req.query.filter) {
        const { whereConditions, errors } = processFilters(
          req.query.filter,
          allowedFields
        );

        errors.forEach((error) => {
          businessError.addError("filter", error);
        });

        whereCondition = { ...whereCondition, ...whereConditions };
      }

      if (businessError.errors.length > 0) {
        throw businessError;
      }

      const [items, total_count] = await Promise.all([
        Model.findAll({
          attributes,
          order,
          offset,
          limit: pageSize,
          where: whereCondition,
          include,
          distinct: true,
        }),
        Model.count({
          where: whereCondition,
          include: include.length > 0 ? include : undefined,
          distinct: true,
        }),
      ]);

      let serializedData = Serializer.serialize(items);
      serializedData = removeEmpty(serializedData);
      serializedData.meta = {
        total: total_count,
        page: pageNumber,
        per_page: pageSize,
      };

      res.json(serializedData);
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      let whereCondition = { id };

      // Add parent ID filter if specified
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }

      const item = await Model.findOne({
        where: whereCondition,
        include: defaultIncludes,
      });

      if (!item) {
        throw new NotFoundError(`${modelName} not found`, modelName);
      }

      let serializedData = Serializer.serialize(item);
      serializedData = removeEmpty(serializedData);
      res.json(serializedData);
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      // Add parent ID if specified
      if (parentIdField && req.params[parentIdField]) {
        req.body[parentIdField] = req.params[parentIdField];
      }

      const newItem = await Model.create(req.body);

      let serializedData = Serializer.serialize(newItem);
      serializedData = removeEmpty(serializedData);
      res.status(201).json(serializedData);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      let whereCondition = { id };

      // Add parent ID filter if specified
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }

      const item = await Model.findOne({ where: whereCondition });

      if (!item) {
        throw new NotFoundError(`${modelName} not found`, modelName);
      }

      await item.update(req.body);

      let serializedData = Serializer.serialize(item);
      serializedData = removeEmpty(serializedData);
      res.json(serializedData);
    } catch (error) {
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      const { id } = req.params;
      let whereCondition = { id };

      // Add parent ID filter if specified
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }

      const item = await Model.findOne({ where: whereCondition });

      if (!item) {
        throw new NotFoundError(`${modelName} not found`, modelName);
      }

      await item.destroy();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
});
