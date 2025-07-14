const { Attendee, Appointment, Calendar } = require("../db");
const config = require("../config/app-config");
const NotFoundError = require("../error/exception/NotFound");
const ConflictError = require("../error/exception/Conflict");
const BusinessError = require("../error/BusinessError");
const AttendeeSerializer = require("../serializers/attendee.serializer");
const { Op } = require("sequelize");



//const appointment = require("../models/appointment");

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
    whereCondition["appointment_id"] = req.params.appointment_id;
    const appointment_id = req.params.appointment_id;
    const calendar_id = req.params.calendar_id;
    console.log(whereCondition);
    const calendar = await Calendar.findOne({
      where: { id: calendar_id },
      include: [
        /*{
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },*/
        {
          model: Appointment,
          as: "Appointments",
        },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }
    const appointment = await Appointment.findOne({
      where: { id: appointment_id, calendar_id },
      include: [
        //{ model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }

    //whereCondition["appointment_id"] = req.params.appointment_id;
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
    const allowedIncludes = ["Appointments"];
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
        } else if (relation === "Appointments") {
          include.push({
            model: Appointment,
            as: "Appointments",
          });
        }
      });
    }

    // Select specific fields
    const allowedFields = [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "appointment_id",
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
          if (!attributes.includes("createdAt")) attributes.push("createdAt");
          if (!attributes.includes("updatedAt")) attributes.push("updatedAt");
          if (!attributes.includes("id")) attributes.push("id");
          if (!attributes.includes("appointment_id"))
            attributes.push("appointment_id");
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
          // Check if the key is in the allowedFields array
          whereCondition[key] = req.query.filter[key];

          // If the key doesn't exist in attributes, push it into attributes
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

    const [attendees, total_count] = await Promise.all([
      Attendee.findAll({
        attributes,
        order,
        offset,
        limit: pageSize,
        where: whereCondition,
        include,
      }),
      Attendee.count({ where: whereCondition }),
    ]);

    let serializedData = AttendeeSerializer.serialize(attendees);
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
}

async function getById(req, res, next) {
  try {
    const id = req.params.id;
    const appointment_id = req.params.appointment_id;
    //const appointment_id = req.params.appointment_id;
    const calendar_id = req.params.calendar_id;
    //console.log(whereCondition);
    const calendar = await Calendar.findOne({
      where: { id: calendar_id },
      include: [
        /*{
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },*/
        {
          model: Appointment,
          as: "Appointments",
        },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }
    const appointment = await Appointment.findOne({
      where: { id: appointment_id, calendar_id },
      include: [
        //{ model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }
    const attendee = await Attendee.findOne({
      where: { id, appointment_id },
      include: [{ model: Appointment, as: "Appointments" }],
    });

    if (!attendee) {
      throw new NotFoundError("Attendee not found", "Attendee");
    }

    let serializedData = AttendeeSerializer.serialize(attendee);
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

async function create(req, res, next) {
  try {
    // Check if the appointment exists
    const appointment_id = req.params.appointment_id;
    //const appointment_id = req.params.appointment_id;
    const calendar_id = req.params.calendar_id;
    //console.log(whereCondition);
    const calendar = await Calendar.findOne({
      where: { id: calendar_id },
      include: [
        /*{
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },*/
        {
          model: Appointment,
          as: "Appointments",
        },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }
    const appointment = await Appointment.findOne({
      where: { id: appointment_id, calendar_id },
      include: [
        //{ model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }
    if (req.params.appointment_id) {
      const appointment = await Appointment.findByPk(req.params.appointment_id);
      if (!appointment) {
        throw new NotFoundError(
          "Referenced appointment not found",
          "Appointment"
        );
      }
    }

    // Check if an attendee with the same email already exists
    /*const existingAttendee = await Attendee.findOne({
      where: {
        email: req.body.email,
        appointment_id: req.body.appointment_id,
      },
    });

    if (existingAttendee) {
      throw new ConflictError(
        "An attendee with this email is already registered for this appointment",
        "Attendee"
      );
    }*/

    const attendee = await Attendee.create(req.body);
    const attendeeWithRelations = await Attendee.findOne({
      where: { id: attendee.id, appointment_id: attendee.appointment_id },
      include: [{ model: Appointment, as: "Appointments" }],
    });

    let serializedData = AttendeeSerializer.serialize(attendeeWithRelations);
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
    /*const id = req.params.id;
    const appointment_id = req.params.appointment_id;
    const existingAttendee = await Attendee.findOne({
      where: { id, appointment_id },
    });

    if (!existingAttendee) {
      throw new NotFoundError("Attendee not found", "Attendee");
    }

    // If updating appointment, check if the new appointment exists
    if (appointment_id) {
      const appointment = await Appointment.findByPk(appointment_id);
      if (!appointment) {
        throw new NotFoundError(
          "Referenced appointment not found",
          "Appointment"
        );
      }
    }*/
    const id = req.params.id;
    const appointment_id = req.params.appointment_id;
    //const appointment_id = req.params.appointment_id;
    const calendar_id = req.params.calendar_id;
    //console.log(whereCondition);
    const calendar = await Calendar.findOne({
      where: { id: calendar_id },
      include: [
        /*{
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },*/
        {
          model: Appointment,
          as: "Appointments",
        },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }
    const appointment = await Appointment.findOne({
      where: { id: appointment_id, calendar_id },
      include: [
        //{ model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }
    const attendee = await Attendee.findOne({
      where: { id, appointment_id },
      include: [{ model: Appointment, as: "Appointments" }],
    });

    if (!attendee) {
      throw new NotFoundError("Attendee not found", "Attendee");
    }

    // If updating email, check for conflicts
    if (req.body.email && req.body.email !== existingAttendee.email) {
      const conflictingAttendee = await Attendee.findOne({
        where: {
          id: { [Op.ne]: id }, // Exclude current attendee
          email: req.body.email,
          appointment_id: appointment_id || existingAttendee.appointment_id,
        },
      });

      /*if (conflictingAttendee) {
        throw new ConflictError(
          "An attendee with this email is already registered for this appointment",
          "Attendee"
        );
      }*/
    }

    await Attendee.update(req.body, { where: { id, appointment_id } });
    const updatedAttendee = await Attendee.findOne({
      where: { id, appointment_id },
      include: [{ model: Appointment, as: "Appointments" }],
    });

    let serializedData = AttendeeSerializer.serialize(updatedAttendee);
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
    const id = req.params.id;
    const appointment_id = req.params.appointment_id;
    //const appointment_id = req.params.appointment_id;
    const calendar_id = req.params.calendar_id;
    //console.log(whereCondition);
    const calendar = await Calendar.findOne({
      where: { id: calendar_id },
      include: [
        /*{
          model: WorkingSlot,
          as: "WorkingSlots",
        },
        {
          model: Provider,
          as: "Provider",
        },*/
        {
          model: Appointment,
          as: "Appointments",
        },
      ],
    });

    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }
    const appointment = await Appointment.findOne({
      where: { calendar_id },
      include: [
        //{ model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }
    const attendee = await Attendee.findOne({
      where: { id, appointment_id },
      include: [{ model: Appointment, as: "Appointments" }],
    });

    if (!attendee) {
      throw new NotFoundError("Attendee not found", "Attendee");
    }

    await Attendee.destroy({ where: { id, appointment_id } });


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
