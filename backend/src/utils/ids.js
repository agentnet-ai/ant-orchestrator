const { randomUUID } = require("node:crypto");

function requestId() {
  return randomUUID();
}

module.exports = { requestId };
