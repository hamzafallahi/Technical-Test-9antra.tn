import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Course = sequelize.define("Course", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: "courses",
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    {
      fields: ['id']
    },
    {
      fields: ['title']
    },
    {
      fields: ['price']
    }
  ]
});

export { Course };
