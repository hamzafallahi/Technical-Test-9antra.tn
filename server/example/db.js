const Sequelize = require("sequelize");
const CalendarModel = require("./models/calendar");
//const CalendarServiceModel = require("./models/calendarservice");
const AppointmentModel = require("./models/appointment");
//const ServiceModel = require("./models/service");
const WorkingSlotModel = require("./models/workingslot");
const ProviderModel = require("./models/provider");
const UserModel = require("./models/user");
//const LocationModel = require("./models/location");
const AttendeeModel = require("./models/attendee");
const MeetingToolModel = require("./models/meetingTool");
require("dotenv").config();
// Initialize database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    timezone: "+01:00",
    // logging: process.env.DEBUG
  }
);

// Check database connection
sequelize
  .authenticate()
  .then(() => console.log("Database connection established successfully."))
  .catch((err) => console.error("Unable to connect to the database:", err));

// Initialize models
const Calendar = CalendarModel(sequelize, Sequelize);
const Appointment = AppointmentModel(sequelize, Sequelize);
const WorkingSlot = WorkingSlotModel(sequelize, Sequelize);
const Provider = ProviderModel(sequelize, Sequelize);
const User = UserModel(sequelize, Sequelize);
const Attendee = AttendeeModel(sequelize, Sequelize);
const MeetingTool = MeetingToolModel(sequelize, Sequelize);

// Initialize associations
User.hasOne(Provider, {
  foreignKey: "user_id",
  as: "provider",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Provider.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Provider.hasMany(Calendar, {
  foreignKey: "provider_id",
  as: "Calendar",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Calendar.belongsTo(Provider, {
  foreignKey: "provider_id",
  as: "Provider",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Calendar.hasMany(WorkingSlot, {
  foreignKey: "calendar_id",
  as: "WorkingSlots",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

WorkingSlot.belongsTo(Calendar, {
  foreignKey: "calendar_id",
  as: "Calendar",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

/*Appointment.belongsTo(WorkingSlot, {
  foreignKey: "working_slots_id",
  as: "WorkingSlot",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});*/
Appointment.belongsTo(Calendar, {
  foreignKey: "calendar_id",
  as: "Calendar",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

/*WorkingSlot.hasMany(Appointment, {
  foreignKey: "working_slots_id",
  as: "Appointments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});*/
Calendar.hasMany(Appointment, {
  foreignKey: "calendar_id",
  as: "Appointments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Appointment.hasMany(Attendee, {
  foreignKey: "appointment_id",
  as: "Attendee",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Attendee.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "Appointments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Provider.hasMany(MeetingTool, {
  foreignKey: "provider_id",
  as: "MeetingTool",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

MeetingTool.belongsTo(Provider, {
  foreignKey: "provider_id",
  as: "Provider",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
MeetingTool.hasMany(Calendar, {
  foreignKey: "meeting_tool_id",
  as: "Calendar",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Calendar.belongsTo(MeetingTool, {
  foreignKey: "meeting_tool_id",
  as: "MeetingTool",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Export models
module.exports = {
  Calendar,
  Appointment,
  WorkingSlot,
  Provider,
  User,
  Attendee,
  MeetingTool,
  sequelize,
};
