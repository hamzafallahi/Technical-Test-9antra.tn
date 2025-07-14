"use strict";
module.exports = (sequelize, DataTypes) => {
  const Calendar = sequelize.define(
    "Calendar",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      provider_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: { type: DataTypes.STRING(30), allowNull: false },
      description: { type: DataTypes.STRING(255) },
      timezone: { type: DataTypes.STRING(255) },
      queuing_system: { type: DataTypes.BOOLEAN, defaultValue: false },
      meeting_tool_id: { type: DataTypes.UUID , allowNull: true },
      //booking_page: { type: DataTypes.STRING(255) },
      duration: {
        type: DataTypes.TIME,
        defaultValue: "00:30:00",
        allowNull: false,
      },
      color: {
        type: DataTypes.ENUM(
          "RED",
          "GREEN",
          "BLUE",
          "YELLOW",
          "PURPLE",
          "ORANGE",
          "BLACK",
          "WHITE",
          "PINK",
          "BROWN",
          "GRAY",
          "CYAN"
        ),
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    { timestamps: true, paranoid: true }
  );

  Calendar.associate = function (models) {
    Calendar.belongsTo(models.Provider, {
      foreignKey: "provider_id",
      as: "Provider",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    /*Calendar.hasMany(models.WorkingSlot, {
      foreignKey: "calendar_id",
      as: "WorkingSlots",
      onDelete: "CASCADE",
    });*/
    Calendar.hasMany(models.Appointment, {
      foreignKey: "calendar_id",
      as: "Appointments",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    /*Calendar.hasMany(models.CalendarService, {
      foreignKey: "calendar_id",
      as: "CalendarServices",
      onDelete: "CASCADE",
    });*/
  };

  return Calendar;
};
