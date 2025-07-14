const BusinessError = require("../error/BusinessError");
const NotFoundError = require("../error/exception/NotFound");
const TechnicalError = require("../error/TechnicalError");
const config = require("../config/app-config");

const bcrypt = require('bcrypt');
const { Op } = require("sequelize");



// Utility function to remove null or empty values and empty relationships
const removeEmpty = (obj) => {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      removeEmpty(obj[key]);
      if (key === 'relationships') {
        Object.keys(obj[key]).forEach(relKey => {
          if (obj[key][relKey].data == null || (Array.isArray(obj[key][relKey].data) && obj[key][relKey].data.length === 0)) {
            delete obj[key][relKey];
          }
        });
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    } else if (obj[key] == null || obj[key] === '') {
      delete obj[key];
    }
  });
  return obj;
};



exports.createCrudOperations = ({
  Model,
  modelName,
  Serializer,
  allowedIncludes = [],
  allowedFields = [],
  defaultIncludes = [],
  uniqueField = null,
  hasPassword = false,
  parentIdField = null
}) => ({

  getAllWithPagination: async (req, res, next) => {
    try {
      let whereCondition = {};
      let include = [];
      const businessError = new BusinessError(400, "Validation Error");

      // Handle parent ID for nested routes (e.g., provider_id for locations)
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }

      // Extract pagination parameters
      const pageSize = req.query["page"]?.["size"] ? parseInt(req.query["page"]["size"], 10) : config.limit;
      const pageNumber = req.query["page"]?.["number"] ? parseInt(req.query["page"]["number"], 10) : 0;

      if (isNaN(pageSize) || pageSize < 1) {
        businessError.addError("page.size", "Page size must be a positive integer.");
      }

      if (isNaN(pageNumber) || pageNumber < 0) {
        businessError.addError("page.number", "Page number must be a non-negative integer.");
      }

      if (businessError.errors.length > 0) throw businessError;

      const offset = pageNumber * pageSize;

      // Extract filter parameters
      if (req.query.filter) {
        Object.keys(req.query.filter).forEach((key) => {
          if (!allowedFields.includes(key)) {
            businessError.addError("filter", 
              `Invalid filter field: ${key}. Allowed fields: ${allowedFields.join(", ")}`);
          } else if (!req.query.filter[key] || req.query.filter[key].trim() === "") {
            businessError.addError("filter", `Filter parameter "${key}" must have a valid value.`);
          } else {
            whereCondition[key] = req.query.filter[key];
          }
        });
      }

      // Handle include parameters
      if (req.query.include) {
        const includes = req.query.include.split(",");
        includes.forEach((relation) => {
          if (!allowedIncludes.includes(relation)) {
            businessError.addError("include",
              `Invalid include parameter: ${relation}. Allowed values: ${allowedIncludes.join(", ")}`);
          } else {
            const includeConfig = defaultIncludes.find(inc => inc.as === relation);
            if (includeConfig) {
              include.push(includeConfig);
            }
          }
        });
      }

      // Filter out empty relations from the include array
      include = include.filter(inc => inc != null);

      // Select specific fields
      let attributes = undefined;
      if (req.query.fields) {
        const fieldsArray = req.query.fields.split(",");
        const requiredFields = ["id", "createdAt", "updatedAt"];
        
        requiredFields.forEach(field => {
          if (!fieldsArray.includes(field)) {
            fieldsArray.push(field);
          }
        });

        const invalidFields = fieldsArray.filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
          businessError.addError("fields",
            `Invalid fields requested: ${invalidFields.join(", ")}. Allowed fields: ${allowedFields.join(", ")}`);
        } else {
          attributes = fieldsArray;
        }
      }

      // Extract sorting parameters
      let order = [];
      if (req.query.sort) {
        const sortFields = req.query.sort.split(",");
        sortFields.forEach((field) => {
          const sortOrder = field.startsWith("-") ? "DESC" : "ASC";
          const sortField = field.replace("-", "");
          order.push([sortField, sortOrder]);
          if (!allowedFields.includes(sortField)) {
            businessError.addError("sort",
              `Invalid sort field: ${field}. Allowed fields: ${allowedFields.join(", ")}`);
          }

          // Check if the sort field is in the attributes array, if not, add it
          if (attributes && !attributes.includes(sortField)) {
            attributes.push(sortField);
          }
        });
      } else {
        order.push(["createdAt", "ASC"]); // Default sort field
      }
      if (businessError.errors.length > 0) throw businessError;

      // Fetch data from the database
      const [items, totalCount] = await Promise.all([
        Model.findAll({
          attributes,
          offset,
          limit: pageSize,
          where: whereCondition,
          include,
          order,
        }),
        Model.count({ where: whereCondition }),
      ]);

      let serializedData = Serializer.serialize(items);
      serializedData = removeEmpty(serializedData);

      // Add meta information
      serializedData.meta = {
        total: totalCount,
        page: pageNumber,
        per_page: pageSize,
      };

      res.status(200).json(serializedData);
    } catch (error) {
      next(error instanceof BusinessError ? error : new TechnicalError(500, "Internal Server Error", error.message));
    }
  },

  create: async (req, res, next) => {
    try {
      const data = req.body;
      
      // Handle parent ID for nested routes (e.g., provider_id for locations)
      if (parentIdField && req.params[parentIdField]) {
        data[parentIdField] = req.params[parentIdField];
      }

      // Handle uniqueness checks
      if (uniqueField) {
        // Handle uniqueField as array or string
        if (Array.isArray(uniqueField)) {
          const businessError = new BusinessError(400, "Validation Error");

          
          // Check each unique field
          for (const field of uniqueField) {
            if (data[field]) {
              const existing = await Model.findOne({ where: { [field]: data[field] } });
              if (existing) {
                businessError.addError(field, `A ${modelName} with this ${field} already exists.`);
              }
            }
          }
          

          if (businessError.errors.length > 0) {
            throw businessError;
          }
        } else {
          // Original behavior for single uniqueField

          const existing = await Model.findOne({ where: { [uniqueField]: data[uniqueField] } });
          if (existing) {
            throw new BusinessError(400, "Validation Error")
              .addError(uniqueField, `A ${modelName} with this ${uniqueField} already exists.`);

          }
        }
      }

      if (hasPassword && data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const newItem = await Model.create(data);
      const item = await Model.findByPk(newItem.id,
        { include: defaultIncludes }
      );
      
  
      //await invalidateCache(req);
      
      let serializedData = Serializer.serialize(item);
      serializedData = removeEmpty(serializedData);
      
      res.status(201).json(serializedData);
    } catch (error) {
      next(error instanceof BusinessError ? error : new TechnicalError(500, "Internal Server Error", error.message));
    }
  },

  getOne: async (req, res, next) => {
    try {
      const id = req.params[`${modelName}_id`];
      const whereCondition = { id };
      
      // Handle parent ID for nested routes (e.g., provider_id for locations)
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }
      
     
      
      const item = await Model.findOne({
        where: whereCondition,
        include: defaultIncludes
      });

      if (!item) {
        throw new NotFoundError(
          `A ${modelName} with the id "${id}" was not found.`,
          `${modelName}Controller`
        );
      }

      let serializedData = Serializer.serialize(item);
      serializedData = removeEmpty(serializedData);
      if (serializedData.included) {
        serializedData.data.included = serializedData.included;
        delete serializedData.included;
        serializedData.included = serializedData.data.included;
        delete serializedData.data.included;
      }
      
     

      res.status(200).json(serializedData);
    } catch (error) {
      next(error instanceof NotFoundError ? error : new TechnicalError(500, "Internal Server Error", error.message));
    }
  },

  update: async (req, res, next) => {
    try {
      const id = req.params[`${modelName}_id`];
      const whereCondition = { id };

      // Handle parent ID for nested routes (e.g., provider_id for locations)
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }
      
      const item = await Model.findOne({
        where: whereCondition,
        include: defaultIncludes
      });

      if (!item) {
        throw new NotFoundError(
          `A ${modelName} with the id "${id}" was not found.`,
          `${modelName}Controller`
        );
      }

      const data = req.body;
      const updatedFields = {};

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          updatedFields[key] = data[key];
        }
      });

      // Check uniqueness for uniqueField if it's being updated
      if (uniqueField && !Array.isArray(uniqueField)) {

        if (updatedFields[uniqueField] && updatedFields[uniqueField] !== item[uniqueField]) {
          const existing = await Model.findOne({
            where: { [uniqueField]: updatedFields[uniqueField] }
          });
          if (existing) {
            throw new BusinessError(400, "Validation Error")
              .addError(uniqueField, `A ${modelName} with this ${uniqueField} already exists.`);
          }
        }
      }
      
      // Handle uniqueField as array
      if (Array.isArray(uniqueField)) {
        const businessError = new BusinessError(400, "Validation Error");
        
        // Check each unique field
        for (const field of uniqueField) {
          if (updatedFields[field] && updatedFields[field] !== item[field]) {
            const existing = await Model.findOne({ 
              where: { 
                [field]: updatedFields[field],
                id: { [Op.ne]: item.id } // Exclude current item
              } 
            });
            
            if (existing) {
              businessError.addError(field, `A ${modelName} with this ${field} already exists.`);
            }
          }
        }
        

        if (businessError.errors.length > 0) {
          throw businessError;
        }
      }

      if (hasPassword && updatedFields.password) {
        updatedFields.password = await bcrypt.hash(updatedFields.password, 10);
      }

      await item.update(updatedFields);
      
      // Invalidate cache after updating the data
      //await invalidateCache(req);
      
      const updatedItem = await Model.findByPk(item.id, {
        include: defaultIncludes
      });
      
      let serializedData = Serializer.serialize(updatedItem);
      serializedData = removeEmpty(serializedData);
      if (serializedData.included) {
        serializedData.data.included = serializedData.included;
        delete serializedData.included;
        serializedData.included = serializedData.data.included;
        delete serializedData.data.included;
      }
      
      res.status(200).json(serializedData);
    } catch (error) {

      next(error instanceof NotFoundError || error instanceof BusinessError 
        ? error 
        : new TechnicalError(500, "Internal Server Error", error.message));

    }
  },

  delete: async (req, res, next) => {
    try {
      const { [`${modelName}_id`]: id } = req.params;
      const businessError = new BusinessError(400, "Validation Error");

      if (!id) {
        businessError.addError(`${modelName}_id`, `${modelName} ID is required`);
        throw businessError;
      }

      const whereCondition = { id };
      
      // Handle parent ID for nested routes (e.g., provider_id for locations)
      if (parentIdField && req.params[parentIdField]) {
        whereCondition[parentIdField] = req.params[parentIdField];
      }
      
      const item = await Model.findOne({ where: whereCondition });
      if (!item) {
        throw new NotFoundError(
          `No ${modelName} found with ID: ${id}`,
          `${modelName}Controller`
        );
      }

      await Model.destroy({
        where: whereCondition
      });
      
      //await invalidateCache(req);
      
      res.status(204).end();
    } catch (error) {
      next(error instanceof BusinessError || error instanceof NotFoundError ? error : new TechnicalError(500, "Internal Server Error", error.message));
    }

  }

});
