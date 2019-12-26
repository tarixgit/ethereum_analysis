"use strict";

module.exports = function(sequelize, DataTypes) {
  const transaction = sequelize.define(
    "transaction",
    {
      bid: DataTypes.INTEGER,
      tid: DataTypes.INTEGER,
      from: DataTypes.INTEGER,
      to: DataTypes.INTEGER,
      amount: DataTypes.DOUBLE
    },
    { timestamps: false, freezeTableName: true }
  );
  return transaction;
};
