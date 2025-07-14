"use strict";

module.exports = (sequelize, DataTypes) => {
  const WorkingSlot = sequelize.define(
    "WorkingSlot",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      calendar_id: { type: DataTypes.UUID, allowNull: false },
      day_of_week: {
        type: DataTypes.ENUM(
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ),
        allowNull: false,
      },      start_time: { type: DataTypes.TIME, allowNull: false },
      end_time: { type: DataTypes.TIME, allowNull: false },
      duration: { type: DataTypes.TIME },
      /*break_start: { type: DataTypes.TIME },
      break_end: { type: DataTypes.TIME },*/
      creation_date: {
        type: DataTypes.DATEONLY,
        defaultValue: false,
        allowNull: true, // Changed to allowNull: true
      },
      /*precise: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },*/
    },
    {
      timestamps: true, // Automatically adds createdAt and updatedAt
      paranoid: true, // Enables soft deletes with deletedAt
    }
  );

  WorkingSlot.associate = function (models) {
    WorkingSlot.belongsTo(models.Calendar, {
      foreignKey: "calendar_id",
      as: "Calendar",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    // Remove the association with Appointments
    /*WorkingSlot.hasMany(models.Appointment, {
      foreignKey: "working_slots_id",
      as: "Appointments",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });*/
  };

  return WorkingSlot;
};
