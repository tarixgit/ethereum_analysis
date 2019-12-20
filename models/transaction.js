"use strict";

module.exports = function(sequelize, DataTypes) {
  const transaction = sequelize.define(
    "transaction",
    {
      name: DataTypes.STRING,
      color: DataTypes.STRING
    },
    { timestamps: false, freezeTableName: true }
  );
  return transaction;
};
