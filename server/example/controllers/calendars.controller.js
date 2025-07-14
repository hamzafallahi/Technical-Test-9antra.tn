const {
  Calendar,
  WorkingSlot,
  Provider,
  Appointment,
  MeetingTool,
} = require("../db");
const config = require("../config/app-config");
const NotFoundError = require("../error/exception/NotFound");
const ConflictError = require("../error/exception/Conflict");
const BusinessError = require("../error/BusinessError");
const CalendarSerializer = require("../serializers/calendar.serializer");

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

async function getAll(req, res, next) {
  try {
    let whereCondition = {};
    let include = [];
    const businessError = new BusinessError(
      400,
      "BAD_REQUEST",
      "Validation error"
    );

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
    const allowedIncludes = [
      "WorkingSlots",
      "Appointments",
      "provider",
      "MeetingTool",
    ];
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
        } else if (relation === "WorkingSlots") {
          include.push({
            model: WorkingSlot,
            as: "WorkingSlots",
          });
        } else if (relation === "provider") {
          include.push({
            model: Provider,
            as: "Provider",
          });
        } else if (relation === "Appointments") {
          include.push({
            model: Appointment,
            as: "Appointments",
          });
        } else if (relation === "MeetingTool") {
          include.push({
            model: MeetingTool,
            as: "MeetingTool",
          });
        }
      });
    }

    // Select specific fields
    const allowedFields = [
      "id",
      "provider_id",
      "name",
      "description",
      "timezone",
      "queuing_system",
      "meeting_tool_id",
      //"booking_page",
      "duration",
      "color",
      "slug",
      "createdAt",
      "updatedAt",
    ];
    //test
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
        }
      }
    }
    // Extract sorting parameters
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
          // Check if the key is in the allowedFields array
          whereCondition[key] = req.query.filter[key];

          // If the key doesn't exist in attributes, push it into attributes
          if (attributes && !attributes.includes(key)) {
            attributes.push(key);
          }
        } else {
          businessError.addError(
            "filter",
            `Filter parameter "${key}" is not a valid field.  Allowed values: ${allowedFields.join(
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
    const [calendars, total_count] = await Promise.all([
      Calendar.findAll({
        attributes,
        order,
        offset,
        limit: pageSize,
        where: whereCondition,
        include,
      }),
      Calendar.count({ where: whereCondition }),
    ]);

    // Serialize the calendars
    let serializedData = CalendarSerializer.serialize(calendars);
    serializedData = removeEmpty(serializedData);

    // Move the `included` array under each `data` object
    /*if (serializedData.included) {
      serializedData.data = serializedData.data.map((calendar) => {
        const calendarIncluded = serializedData.included.filter(
          (includedItem) =>
            includedItem.type === "WorkingSlots" &&
            calendar.relationships.working_slots.data.some(
              (slot) => slot.id === includedItem.id
            )
        );

        return {
          ...calendar,
          included: calendarIncluded,
        };
      });

      // Remove the top-level `included` array
      delete serializedData.included;
    }*/

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
    const {
      provider_id,
      name,
      description,
      timezone,
      queuing_system,
      meeting_tool_id,
      //booking_page,
      duration,
      color,
      slug,
    } = req.body;

    // Check if the calendar already exists
    const existingCalendar = await Calendar.findOne({
      where: {
        provider_id,
        name,
        description,
        timezone,
        queuing_system,
        meeting_tool_id,
        // booking_page,
        duration,
        color,
        slug,
      },
    });

    // If the calendar already exists, throw a ConflictError
    /* if (existingCalendar) {
      throw new ConflictError("Calendar already exists", "Calendar");
    }*/

    // Create the calendar
    const calendar = await Calendar.create(req.body);
    const calendarWithRelations = await Calendar.findOne({
      where: { id: calendar.id },
      include: [
        { model: Provider, as: "Provider" },
        { model: MeetingTool, as: "MeetingTool" },
      ],
    });

    let serializedData = CalendarSerializer.serialize(calendarWithRelations);
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);

    // Invalidate cache

    res.status(201).json(serializedData);
  } catch (error) {
    // Pass the error to the error-handling middleware
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params; // Use `id` instead of `calendar_id`
    const {
      provider_id,
      name,
      description,
      timezone,
      queuing_system,
      meeting_tool_id,
      //booking_page,
      duration,
      color,
      slug,
    } = req.body;

    // Find the existing calendar
    const existingCalendar = await Calendar.findOne({
      where: { id },
    });

    // If the calendar doesn't exist, throw a NotFoundError
    if (!existingCalendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }

    // Update the calendar
    await Calendar.update(
      {
        provider_id,
        name,
        description,
        timezone,
        queuing_system,
        meeting_tool_id,
        //booking_page,
        duration,
        color,
        slug,
      },
      {
        where: { id },
      }
    );

    // Fetch the updated calendar
    const updatedCalendar = await Calendar.findOne({
      where: { id },
      include: [
        { model: Provider, as: "Provider" },
        { model: MeetingTool, as: "MeetingTool" },
      ],
    });

    let serializedData = CalendarSerializer.serialize(updatedCalendar);
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);

    // Invalidate cache
    //await invalidateCache(req);

    res.json(serializedData);
  } catch (error) {
    // Pass the error to the error-handling middleware
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch data from the database
    const calendar = await Calendar.findOne({
      where: { id },
      include: [
        {
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },
        {
          model: Appointment,
          as: "Appointments",
        },
        { model: MeetingTool, as: "MeetingTool" },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }

    let serializedData = CalendarSerializer.serialize(calendar);
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
    const { id } = req.params; // Use `id`

    // Check if the calendar exists
    const existingCalendar = await Calendar.findOne({
      where: { id },
    });

    if (!existingCalendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }

    // Delete the calendar
    await Calendar.destroy({
      where: { id },
    });

    // Invalidate cache
    //await invalidateCache(req);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAll,
  getById,
  remove,
  create,
  update,
};
