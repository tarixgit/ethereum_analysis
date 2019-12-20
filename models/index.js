"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
// const config = require("../config/config.json");
const config = {
  db: {
    host: "192.168.10.68",
    port: "5432",
    dbname: "ethereum",
    user: "ether",
    pass: "temp123"
  }
};
const {
  db: { dbname, user, pass, host, port }
} = config;
// TODO use dotenv
const sequelize = new Sequelize(dbname, user, pass, {
  host: host,
  port: port,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const db = {};

fs.readdirSync(__dirname)
  .filter(file => file.indexOf(".") !== 0 && file !== "index.js")
  .forEach(file => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

// Object.keys(db).forEach(modelName => {
//   if ("associate" in db[modelName]) {
//     db[modelName].associate(db);
//   }
// });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
