const Conversation = require("./Conversation");
const Message = require("./Message");

function initModels() {
  Conversation.hasMany(Message, { foreignKey: "conversationId", sourceKey: "conversationId" });
  Message.belongsTo(Conversation, { foreignKey: "conversationId", targetKey: "conversationId" });
}

const models = { Conversation, Message };

module.exports = { models, initModels };
