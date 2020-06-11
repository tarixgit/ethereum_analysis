"use strict";

module.exports = function(sequelize, DataTypes) {
  const log = sequelize.define("log", {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    data: DataTypes.JSONB
  });
  return log;
};
