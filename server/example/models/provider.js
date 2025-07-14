"use strict";
module.exports = (sequelize, DataTypes) => {
  const Provider = sequelize.define(
    "Provider",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4, // Ensures one-to-one relation with users table
      },
      business_name: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      landline: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      about: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "providers",
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ["user_id"], unique: true },
        { fields: ["business_name"] },
        { fields: ["category"] },
        { fields: ["slug"], unique: true },
        { fields: ["phone"] },
        { fields: ["landline"] },
        { fields: ["createdAt"] },
        { fields: ["updatedAt"] },
      ],
    }
  );

  Provider.associate = (models) => {
    // Each Provider belongs to a User (alias updated to 'user')
    /* Provider.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user", // Ensure the alias matches the one used in queries
      onDelete: "CASCADE",
    });*/
    Provider.hasMany(models.Calendar, {
      foreignKey: "provider_id",
      as: "Calendar",
      onDelete: "CASCADE",
    });


    Provider.hasMany(models.MeetingTool, {
      foreignKey: "provider_id",
      as: "MeetingTool",
      onDelete: "CASCADE",
    });

    // Each Provider can have many Locations
    /*Provider.hasMany(models.Location, {
      foreignKey: 'provider_id',
      as: 'location',
      onDelete: 'CASCADE',
    });*/

    // Each Provider can have many ProviderServices
    /* Provider.hasMany(models.ProviderService, {
      foreignKey: 'provider_id',
      as: 'service',
      onDelete: 'CASCADE',
    });*/

    // Each Provider can have many MeetingTools
    /*Provider.hasMany(models.MeetingTool, {
      foreignKey: 'provider_id',
      as: 'meeting_tool',
      onDelete: 'CASCADE',
    });
    */
    // Each Provider can have many Settings
    /*Provider.hasOne(models.Setting, {
      foreignKey: 'provider_id',
      as: 'setting',
      onDelete: 'CASCADE',
    });*/
  };

  return Provider;
};
