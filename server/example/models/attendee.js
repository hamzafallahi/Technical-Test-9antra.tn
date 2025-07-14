// File: models/attendee.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const Attendee = sequelize.define(
    "Attendee",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      timestamps: true, // Automatically adds createdAt and updatedAt
      paranoid: true, // Enables soft deletes with deletedAt
    }
  );

  Attendee.associate = function (models) {
    Attendee.belongsTo(models.Appointment, {
      foreignKey: "appointment_id", // Foreign key in the Attendee table referencing Appointment
      as: "Appointments", // Alias for the association
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Attendee;
};
