'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // More explicit association
      const { Provider } = models;
      User.hasOne(Provider, {
        foreignKey: 'user_id',
        sourceKey: 'id',
        as: 'provider',
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('provider', 'assistant'),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn('NOW'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn('NOW'),
      },
    },
    {
      sequelize,
      modelName: 'user',
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          fields: ['first_name'],
          name: 'users_first_name_index',
        },
        {
          fields: ['last_name'],
          name: 'users_last_name_index',
        },
        {
          fields: ['email'],
          unique: true,
          name: 'users_email_index',
        },
        {
          fields: ['role'],
          name: 'users_role_index',
        },
        {
          fields: ['createdAt'],
          name: 'users_createdAt_index',
        },
        {
          fields: ['updatedAt'],
          name: 'users_updatedAt_index',
        },
      ],
    }
  );

  return User;
};
