"use strict";
module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      //working_slots_id: { type: DataTypes.UUID, allowNull: false },
      calendar_id: { type: DataTypes.UUID, allowNull: false },
      //attendees_id: { type: DataTypes.UUID, allowNull: false },
      meeting_link: { type: DataTypes.STRING(255), allowNull: true },
      start_time: { type: DataTypes.TIME, allowNull: false }, // Updated to TIME
      end_time: { type: DataTypes.TIME, allowNull: false }, // Updated to TIME
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "canceled", "completed"),
        allowNull: false,
      },


      /*feedback: { type: DataTypes.INTEGER, allowNull: true },
      feedback_text: { type: DataTypes.STRING(255), allowNull: true },*/
      date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        allowNull: false, // Changed from allowNull: true
      },
    },
    { timestamps: true, paranoid: true }
  );

  Appointment.associate = function (models) {
    /* Appointment.belongsTo(models.WorkingSlot, {
      foreignKey: "working_slots_id",
      as: "WorkingSlot",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });*/
    Appointment.belongsTo(models.Calendar, {
      foreignKey: "calendar_id",
      as: "Calendar",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Appointment.hasMany(models.Attendee, {
      foreignKey: "appointment_id",
      as: "Attendee",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Appointment;
};
