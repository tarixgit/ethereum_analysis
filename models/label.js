const sequelize = require("sequelize");

("use strict");
module.exports = function(sequelize, DataTypes) {
  var New = sequelize.define(
    "label",
    {
      label: DataTypes.STRING,
      color: DataTypes.STRING
    },
    {}
  );
  return New;
};
