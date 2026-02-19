const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/connection");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("user", "assistant"),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  trace: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  indexes: [{ fields: ["conversationId"] }],
});

module.exports = Message;
