const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "ant_orchestrator",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
  }
);

let _dbReachable = false;

async function testDbConnection() {
  try {
    await sequelize.authenticate();
    console.log("db connected");

    if (process.env.ENABLE_DB_SYNC === "true") {
      await sequelize.sync();
      console.log("db synced");
    }

    _dbReachable = true;
    return true;
  } catch (err) {
    _dbReachable = false;
    console.warn(`db unavailable – running without database (${err.message})`);
    return false;
  }
}

function isDbReachable() {
  return _dbReachable;
}

module.exports = { sequelize, testDbConnection, isDbReachable };
