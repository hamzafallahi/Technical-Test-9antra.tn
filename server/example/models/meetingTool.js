'use strict';
module.exports = (sequelize, DataTypes) => {
  const MeetingTool = sequelize.define('MeetingTool', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    provider_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'providers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    access_token: {
      type: DataTypes.CHAR(255),
      allowNull: false,
      unique: true,
    },
    refresh_token: {
      type: DataTypes.CHAR(255),
      allowNull: true,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'meeting_tools',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['provider_id'] },
      { fields: ['name'] },
      { fields: ['access_token'] },
      { fields: ['refresh_token'] },
      { fields: ['expires_at'] },
      { fields: ['createdAt'] },
      { fields: ['updatedAt'] },
    ],
  });

  MeetingTool.associate = (models) => {
    MeetingTool.belongsTo(models.Provider, {
      foreignKey: 'provider_id',
      as: 'provider',
      onDelete: 'CASCADE',
    });
  };

  return MeetingTool;
};
