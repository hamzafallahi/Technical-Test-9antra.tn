const { WorkingSlot, Calendar, Appointment } = require("../db");
const config = require("../config/app-config");
const NotFoundError = require("../error/exception/NotFound");
const ConflictError = require("../error/exception/Conflict");
const BusinessError = require("../error/BusinessError");
const WorkingSlotSerializer = require("../serializers/workingslot.serializer");
const { Op } = require("sequelize");
const moment = require("moment");

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

/**
 * Validate if the creation date matches the specified day of week
 * @param {string} dayOfWeek - Day of the week (Monday, Tuesday, etc.)
 * @param {string} creationDate - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date matches the day of week, false otherwise
 */
const validateDateMatchesDayOfWeek = (dayOfWeek, creationDate) => {
  const validationResult = { isValid: true, errors: [] };
  if (!creationDate) return validationResult;

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const date = moment(creationDate);
  const dateDayOfWeek = daysOfWeek[date.day()];

  if (dateDayOfWeek !== dayOfWeek) {
    validationResult.isValid = false;
    validationResult.errors.push({
      field: "creationDate",
      message: `working slot date (${creationDate}) is a ${dateDayOfWeek}, but the working slot is for ${dayOfWeek}`,
    });
  }

  return validationResult;
};

/**
 * Check for conflicts with existing working slots
 * @param {Object} slotData - Working slot data
 * @param {string} excludeId - ID to exclude from conflict check (for updates)
 * @returns {Promise<boolean>} True if conflict exists, false otherwise
 */
const checkForConflicts = async (slotData, excludeId = null) => {
  const whereCondition = {
    calendar_id: slotData.calendar_id,
    day_of_week: slotData.day_of_week,
    start_time: slotData.start_time,
    end_time: slotData.end_time,
    creation_date: slotData.creation_date,
  };

  if (excludeId) {
    whereCondition.id = { [Op.ne]: excludeId };
  }

  const existingSlot = await WorkingSlot.findOne({ where: whereCondition });
  return !!existingSlot;
};

async function getAll(req, res, next) {
  try {
    let whereCondition = {};
    whereCondition["calendar_id"] = req.params.id;
    let include = [];

    const businessError = new BusinessError(400, "BAD_REQUEST", "Bad Request");

    // Extract pagination parameters
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

    // Handle relationships (includes)
    const allowedIncludes = ["Calendar"];
    if (req.query.include) {
      const requestedIncludes = req.query.include.split(",");
      requestedIncludes.forEach((relation) => {
        if (!allowedIncludes.includes(relation)) {
          businessError.addError(
            "include",
            `Invalid include parameter: ${relation}. Allowed values: ${allowedIncludes.join(
              ", "
            )}`
          );
        } else if (relation === "Calendar") {
          include.push({
            model: Calendar,
            as: "Calendar",
          });
        }
      });
    }

    // Select specific fields
    const allowedFields = [
      "id",
      "calendar_id",
      "day_of_week",
      "start_time",
      "end_time",
      "duration",
      "creation_date",
      "createdAt",
      "updatedAt",
    ];

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
          if (!attributes.includes("createdAt")) {
            attributes.push("createdAt");
          }
          if (!attributes.includes("updatedAt")) {
            attributes.push("updatedAt");
          }
          if (!attributes.includes("id")) attributes.push("id");
          if (!attributes.includes("calendar_id"))
            attributes.push("calendar_id");
        }
      }
    }
    
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
    
    // Extract filter parameters
    if (req.query.filter) {
      Object.keys(req.query.filter).forEach((key) => {
        if (!req.query.filter[key] || req.query.filter[key] == " ") {
          businessError.addError(
            "filter",
            `Filter parameter "${key}" must have a valid value.`
          );
        } else if (allowedFields.includes(key)) {
          whereCondition[key] = req.query.filter[key];

          if (attributes && !attributes.includes(key)) {
            attributes.push(key);
          }
        } else {
          businessError.addError(
            "filter",
            `Filter parameter "${key}" is not a valid field. Allowed values: ${allowedFields.join(
              ", "
            )}`
          );
        }
      });
    }

    if (businessError.errors.length > 0) {
      throw businessError;
    }

    // Fetch data from the database
    const [workingSlots, total_count] = await Promise.all([
      WorkingSlot.findAll({
        attributes,
        order,
        offset,
        limit: pageSize,
        where: whereCondition,
        include,
      }),
      WorkingSlot.count({ where: whereCondition }),
    ]);

    // Serialize the working slots
    let serializedData = WorkingSlotSerializer.serialize(workingSlots);
    serializedData = removeEmpty(serializedData);
    
    // Add pagination meta information
    serializedData.meta = {
      total: total_count,
      page: pageNumber,
      per_page: pageSize,
    };

    res.json(serializedData);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    // Ensure creation_date is present - if not added by deserializer
    if (!req.body.creation_date) {
      req.body.creation_date = null;
    }
    
    // If duration is not provided, get it from the calendar
    if (!req.body.duration) {
      const calendar = await Calendar.findByPk(req.params.calendar_id);
      if (!calendar) {
        throw new NotFoundError("Calendar not found", "Calendar");
      }
      req.body.duration = calendar.duration;
    }

    // Validate that the creation_date matches the specified day_of_week
    if (req.body.creation_date && req.body.day_of_week) {
      const isValidDate = validateDateMatchesDayOfWeek(
        req.body.day_of_week,
        req.body.creation_date
      );
      if (!isValidDate.isValid) {
        const businessError = new BusinessError(
          400,
          "INVALID_WORKINGSLOT_DATE",
          "Invalid WORKINGSLOT DATE configuration"
        );
        isValidDate.errors.forEach((error) => {
          businessError.addError(error.field, error.message);
        });
        throw businessError;
      }
    }

    // Check if the working slot already exists
    const existingSlot = await WorkingSlot.findOne({
      where: {
        calendar_id: req.params.calendar_id,
        day_of_week: req.body.day_of_week,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        creation_date: req.body.creation_date,
      },
    });

    if (existingSlot) {
      throw new ConflictError("Working slot already exists", "WorkingSlot");
    }

    // Create a single working slot
    const workingSlot = await WorkingSlot.create(req.body);
    const workingSlotWithRelations = await WorkingSlot.findOne({
      where: { id: workingSlot.id },
      include: [{ model: Calendar, as: "Calendar" }],
    });

    let serializedData = WorkingSlotSerializer.serialize(
      workingSlotWithRelations
    );
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);

    res.status(201).json(serializedData);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { calendar_id } = req.params;
    
    const existingSlot = await WorkingSlot.findOne({ 
      where: { id, calendar_id } 
    });

    if (!existingSlot) {
      throw new NotFoundError("Working slot not found", "WorkingSlot");
    }

    // Update the working slot
    await WorkingSlot.update(req.body, { where: { id, calendar_id } });

    // Return the updated slot
    const updatedSlot = await WorkingSlot.findOne({
      where: { id, calendar_id },
      include: [{ model: Calendar, as: "Calendar" }],
    });

    let serializedData = WorkingSlotSerializer.serialize(updatedSlot);
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);
    
    res.json(serializedData);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { calendar_id } = req.params;
    
    const workingSlot = await WorkingSlot.findOne({
      where: { id, calendar_id },
      include: [{ model: Calendar, as: "Calendar" }],
    });

    if (!workingSlot) {
      throw new NotFoundError("Working slot not found", "WorkingSlot");
    }

    let serializedData = WorkingSlotSerializer.serialize(workingSlot);
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);
    res.json(serializedData);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { calendar_id } = req.params;
    
    const existingSlot = await WorkingSlot.findOne({
      where: { id, calendar_id },
    });

    if (!existingSlot) {
      throw new NotFoundError("Working slot not found", "WorkingSlot");
    }

    // Delete the working slot
    await WorkingSlot.destroy({ where: { id, calendar_id } });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
