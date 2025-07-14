const {
  Appointment,
  WorkingSlot,
  Calendar,
  Attendee,
  sequelize,
} = require("../db");

const config = require("../config/app-config");
const NotFoundError = require("../error/exception/NotFound");
const ConflictError = require("../error/exception/Conflict");
const BusinessError = require("../error/BusinessError");
const AppointmentSerializer = require("../serializers/appointment.serializer");
const { Op } = require("sequelize");
const moment = require("moment");

const { createCalendarEvent } = require("../utils/googleCalendar");
const appointmentService = require("../services/appointments.service");

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
    if (key.includes(".")) {
      const [relationName, fieldName] = key.split(".");

      if (!["Calendar", "Attendee"].includes(relationName)) {
        errors.push(
          `Filtering on relationship "${relationName}" is not supported`
        );
        continue;
      }

      if (!whereConditions.$include) {
        whereConditions.$include = {};
      }
      if (!whereConditions.$include[relationName]) {
        whereConditions.$include[relationName] = {};
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        whereConditions.$include[relationName][fieldName] =
          processOperatorObject(value, operatorMap);
      } else {
        whereConditions.$include[relationName][fieldName] =
          processDirectValue(value);
      }

      continue;
    }

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

async function getAll(req, res, next) {
  try {
    let whereCondition = {};
    whereCondition["calendar_id"] = req.params.id;
    let include = [];
    const businessError = new BusinessError(
      400,
      "BAD_REQUEST",
      "Validation error"
    );

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

    const allowedIncludes = ["Calendar", "Attendee"];
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
        } else if (relation === "Attendee") {
          include.push({
            model: Attendee,
            as: "Attendee",
          });
        }
      });
    }

    const allowedFields = [
      "id",
      "calendar_id",
      "meeting_link",
      "start_time",
      "end_time",
      "status",
      "date",
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

    if (req.query.filter) {
      const { whereConditions, errors } = processFilters(
        req.query.filter,
        allowedFields
      );

      errors.forEach((error) => {
        businessError.addError("filter", error);
      });

      if (whereConditions.$include) {
        for (const [relationName, conditions] of Object.entries(
          whereConditions.$include
        )) {
          const relationInclude = include.find(
            (inc) => inc.as === relationName
          );

          if (relationInclude) {
            relationInclude.where = conditions;
          } else {
            const model =
              relationName === "Calendar"
                ? Calendar
                : relationName === "Attendee"
                ? Attendee
                : null;

            if (model) {
              include.push({
                model,
                as: relationName,
                where: conditions,
              });
            }
          }
        }

        delete whereConditions.$include;
      }

      whereCondition = { ...whereCondition, ...whereConditions };
    }

    if (businessError.errors.length > 0) {
      throw businessError;
    }

    const [appointments, total_count] = await Promise.all([
      Appointment.findAll({
        attributes,
        order,
        offset,
        limit: pageSize,
        where: whereCondition,
        include,
        distinct: true,
      }),
      Appointment.count({
        where: whereCondition,
        include:
          include.length > 0
            ? include.map((inc) => ({
                model: inc.model,
                as: inc.as,
                where: inc.where,
              }))
            : undefined,
        distinct: true,
      }),
    ]);

    let serializedData = AppointmentSerializer.serialize(appointments);
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
    const { id } = req.params;
    const { calendar_id } = req.params;
    const appointment = await Appointment.findOne({
      where: { id, calendar_id },
      include: [
        { model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }

    let serializedData = AppointmentSerializer.serialize(appointment);
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

const validateAppointmentTime = async (calendar, startTime, endTime, date) => {
  const validationResult = { isValid: true, errors: [] };

  const appointmentDate = moment(date, "YYYY-MM-DD");
  const dayOfWeek = moment.weekdays(appointmentDate.day());

  const workingSlot = await WorkingSlot.findOne({
    where: {
      calendar_id: calendar.id,
      day_of_week: dayOfWeek,
      start_time: { [Op.lte]: startTime },
      end_time: { [Op.gte]: endTime },      [Op.or]: [
        { creation_date: null },
        { creation_date: date },
      ],
    },
  });

  if (!workingSlot) {
    validationResult.isValid = false;
    validationResult.errors.push({
      field: "date",
      message: `No working slot available for ${dayOfWeek} at ${startTime}-${endTime}`,
    });
    return validationResult;
  }

  if (workingSlot.duration) {
    const appointmentStart = moment.duration(startTime);
    const appointmentEnd = moment.duration(endTime);
    const appointmentDuration = moment.duration(
      appointmentEnd - appointmentStart
    );

    const workingSlotDuration = moment.duration(workingSlot.duration);

    const appointmentMinutes = appointmentDuration.asMinutes();
    const workingSlotMinutes = workingSlotDuration.asMinutes();

    if (appointmentMinutes > workingSlotMinutes) {
      validationResult.isValid = false;
      validationResult.errors.push({
        field: "duration",
        message: `Appointment duration (${appointmentMinutes} minutes) exceeds the allowed duration (${workingSlotMinutes} minutes)`,
      });
    }
  }

  if (startTime < workingSlot.start_time || endTime > workingSlot.end_time) {
    validationResult.isValid = false;
    validationResult.errors.push({
      field: "start_time",
      message: `Appointment must be within working slot time frame (${workingSlot.start_time} - ${workingSlot.end_time})`,
    });
    validationResult.errors.push({
      field: "end_time",
      message: `Appointment must be within working slot time frame (${workingSlot.start_time} - ${workingSlot.end_time})`,
    });
  }

  return validationResult;
};

async function create(req, res, next) {
    try {
      // Use our new service to create the appointment with provider credentials
      const result = await appointmentService.createAppointment(req, res, next);
      
      if (!result || !result.appointment) {
        throw new Error('Failed to create appointment');
      }
      
      // Get the appointment with relationships for the response
      const appointmentWithRelations = await Appointment.findOne({
        where: {
          id: result.appointment.id,
          calendar_id: result.appointment.calendar_id,
        },
        include: [
          { model: Calendar, as: "Calendar" },
          { model: Attendee, as: "Attendee" },
        ],
      });
      
      console.log('[APPOINTMENTS CONTROLLER] Appointment created with ID:', result.appointment.id);

      // Format and return the response
      let serializedData = AppointmentSerializer.serialize(
        appointmentWithRelations
      );
      if (serializedData.included) {
        serializedData.data.included = serializedData.included;
        delete serializedData.included;
        serializedData.included = serializedData.data.included;
        delete serializedData.data.included;
      }
      serializedData = removeEmpty(serializedData);
      
    
        // Add appropriate metadata based on the result
      if (result.meetingLink && !result.meetingLink.match(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/)) {
        res.status(201).json({
          ...serializedData,
          meta: {
            ...(serializedData.meta || {}),
            warnings: [
              result.usingProviderCredentials ? 
                "Using a fallback meeting link. Provider's Google credentials may be invalid." :
                "Using a fallback meeting link. For a real Google Meet link, provide a valid Google OAuth token in the x-access-token header."
            ]
          }
        });
      } else if (result.usingProviderCredentials && result.tokenRefreshed) {
        res.status(201).json({
          ...serializedData,
          meta: {
            ...(serializedData.meta || {}),
            notices: [
              "Appointment created using provider's Google Calendar credentials."
            ]
          }
        });
      } else if (result.emailsSent) {
        // Inform the user that emails were sent to attendees
        const attendees = result.attendees || [];
        
        // Determine email method used
        const emailMethod = result.manualEmailsSent ? 
          "Manual email notifications" :
          "Meeting invitation emails";
          
        res.status(201).json({
          ...serializedData,
          meta: {
            ...(serializedData.meta || {}),
            notices: [
              `${emailMethod} have been sent to ${attendees.length} attendee(s)${result.manualEmailsSent ? "" : " with Google Meet link"}.`
            ]
          }
        });
      } else {
        res.status(201).json(serializedData);
      }
    } catch (error) {
      next(error);
    }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { calendar_id } = req.params;
    const existingAppointment = await Appointment.findOne({
      where: { id, calendar_id },
      include: [
        { model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    if (!existingAppointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }

    const start_time = req.body.start_time || existingAppointment.start_time;
    const end_time = req.body.end_time || existingAppointment.end_time;
    const date = req.body.date || existingAppointment.date;

    const calendar = existingAppointment.Calendar || await Calendar.findByPk(calendar_id);
    if (!calendar) {
      throw new NotFoundError("Calendar not found", "Calendar");
    }

    const timeValidation = await validateAppointmentTime(
      calendar,
      start_time,
      end_time,
      date
    );
    if (!timeValidation.isValid) {
      const businessError = new BusinessError(
        400,
        "INVALID_APPOINTMENT_TIME",
        "Invalid appointment time configuration"
      );
      timeValidation.errors.forEach((error) => {
        businessError.addError(error.field, error.message);
      });
      throw businessError;
    }

    if (req.body.start_time || req.body.end_time || req.body.date) {
      const conflictingAppointment = await Appointment.findOne({
        where: {
          id: { [Op.ne]: id },
          calendar_id,
          status: ["pending", "confirmed"],
          date,
          [Op.or]: [
            {
              [Op.and]: [
                { start_time: { [Op.lte]: start_time } },
                { end_time: { [Op.gt]: start_time } },
              ],
            },
            {
              [Op.and]: [
                { start_time: { [Op.lt]: end_time } },
                { end_time: { [Op.gte]: end_time } },
              ],
            },
            {
              [Op.and]: [
                { start_time: { [Op.gte]: start_time } },
                { end_time: { [Op.lte]: end_time } },
              ],
            },
          ],
        },
      });

      if (conflictingAppointment) {
        throw new ConflictError("Time slot already booked", "Appointment");
      }
    }

    // Initialize variables for Google Calendar integration
    const meetingLink = req.body.meeting_link || existingAppointment.meeting_link;
    const isGoogleMeetLink = meetingLink && meetingLink.includes('meet.google.com');
    let accessToken = null;
    let emailsSent = false;
    let tokenRefreshed = false;
    let usingProviderCredentials = false;
    
    // First, try to get token from the request header
    const headerAccessToken = req.headers['x-access-token'];
    if (headerAccessToken) {
      console.log('Using access token from x-access-token header for appointment update');
      accessToken = headerAccessToken;
    } 
    // If no token in header, try to get from provider credentials (similar to create)
    else if (!req.user?.googleAccessToken) {
      const providerData = await appointmentService.getProviderMeetingTool(req);
      if (providerData && providerData.meetingTool) {
        const { meetingTool } = providerData;
        
        try {
          if (meetingTool.refresh_token) {
            console.log('Using provider\'s refresh token to get access token for Google Calendar');
            accessToken = await appointmentService.refreshGoogleToken(meetingTool.refresh_token);
            usingProviderCredentials = true;
            tokenRefreshed = true;
          }
        } catch (refreshError) {
          console.error('Failed to refresh token from provider credentials:', refreshError.message);
        }
      } else {
        console.log('No provider credentials available for Google Calendar integration');
      }
    } else {
      accessToken = req.user.googleAccessToken;
    }
    
    // If we have a token, update the Google Calendar event
    if (accessToken) {
      try {
        const calendarName = calendar.name || 'Appointment';
        const attendees = existingAppointment.Attendee || [];
        let description = `Appointment on ${date} from ${start_time} to ${end_time}`;
        
        if (attendees.length > 0) {
          description += `\nAttendees: ${attendees.map(a => `${a.first_name} ${a.last_name}`).join(', ')}`;
        }
        
        // Format attendees for Google Calendar
        const calendarAttendees = attendees.map(attendee => ({
          email: attendee.email,
          first_name: attendee.first_name || '',
          last_name: attendee.last_name || '',
        }));
        
        console.log(`Updating Google Calendar event for appointment ID ${id} with ${attendees.length} attendee(s)`);
        
        const googleCalendarEvent = await createCalendarEvent(accessToken, {
          summary: calendarName,
          description: description,
          date,
          startTime: start_time,
          endTime: end_time,
          attendees: calendarAttendees,
          calendarId: 'primary',
          // Set sendUpdates to 'all' to send notifications to attendees
          sendUpdates: 'all'
        });

        if (googleCalendarEvent && googleCalendarEvent.meetLink) {
          req.body.meeting_link = googleCalendarEvent.meetLink;
          emailsSent = true;
          console.log(`Updated Google Calendar event with ID: ${googleCalendarEvent.id}`);
          console.log(`Email notifications sent to ${attendees.length} attendee(s)`);
        }
      } catch (googleError) {
        console.error("Failed to update Google Calendar event:", googleError.message);
        if (googleError.response) {
          console.error("Response error data:", googleError.response.data);
        }
      }
    }

    // Update the appointment in the database
    await Appointment.update(req.body, { where: { id, calendar_id } });

    // Get the updated appointment with related data
    const updatedAppointment = await Appointment.findOne({
      where: { id, calendar_id },
      include: [
        { model: Calendar, as: "Calendar" },
        { model: Attendee, as: "Attendee" },
      ],
    });

    // Serialize the data for response
    let serializedData = AppointmentSerializer.serialize(updatedAppointment);
    if (serializedData.included) {
      serializedData.data.included = serializedData.included;
      delete serializedData.included;
      serializedData.included = serializedData.data.included;
      delete serializedData.data.included;
    }
    serializedData = removeEmpty(serializedData);
    
    // Add appropriate metadata based on the result
    if (emailsSent) {
      const attendees = updatedAppointment.Attendee || [];
      res.json({
        ...serializedData,
        meta: {
          ...(serializedData.meta || {}),
          notices: [
            `Appointment updated. Email notifications with the new details sent to ${attendees.length} attendee(s).`
          ]
        }
      });
    } else if (usingProviderCredentials && tokenRefreshed) {
      res.json({
        ...serializedData,
        meta: {
          ...(serializedData.meta || {}),
          notices: [
            "Appointment updated using provider's Google Calendar credentials."
          ]
        }
      });
    } else if (!accessToken && isGoogleMeetLink) {
      res.json({
        ...serializedData,
        meta: {
          ...(serializedData.meta || {}),
          warnings: [
            "Appointment updated, but no email notifications were sent. To send notifications with Google Calendar, provide a valid Google OAuth token in the x-access-token header."
          ]
        }
      });
    } else {
      res.json(serializedData);
    }
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const { calendar_id } = req.params;
    const existingAppointment = await Appointment.findOne({ where: { id } });

    if (!existingAppointment) {
      throw new NotFoundError("Appointment not found", "Appointment");
    }

    const meetingLink = existingAppointment.meeting_link;
    const isGoogleMeetLink = meetingLink && meetingLink.includes('meet.google.com');
    
    if (isGoogleMeetLink) {
      console.log(`Appointment with Google Meet link deleted: ${meetingLink}`);
      console.log("Note: The Google Calendar event may still exist as we don't store the event ID.");
    }

    await Appointment.destroy({ where: { id, calendar_id } });
    

    
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
