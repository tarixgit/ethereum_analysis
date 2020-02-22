"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const dotenv = require("dotenv");
const result = dotenv.config();

if (result.error) {
  throw result.error;
}

// const config = require("../config/config.json");
/*
const config = {
  db: {
    host: "192.168.10.68",
    port: "5432",
    dbname: "ethereum",
    user: "ether",
    pass: "temp123"
  }
};
*/

const config = {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dbname: process.env.DB_DBNAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS
  }
};
const {
  db: { dbname, user, pass, host, port }
} = config;

const sequelize = new Sequelize(dbname, user, pass, {
  host: host,
  port: port,
  dialect: "postgres",
  pool: {
    max: 5, // TODO increase?
    min: 0,
    acquire: 60000, //  TODO configure this to timeout for postgrss
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
// var model = sequelize['import'](path.join(__dirname, file));

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
