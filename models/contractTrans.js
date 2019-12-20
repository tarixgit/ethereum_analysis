"use strict";

module.exports = function(sequelize, DataTypes) {
  const contractTrans = sequelize.define(
    "contract_trans",
    {
      cid: DataTypes.STRING,
      bid: DataTypes.INTEGER,
      tid: DataTypes.INTEGER, // smallint
      i: DataTypes.INTEGER,
      type: DataTypes.INTEGER, // smallint
      to: DataTypes.INTEGER,
      amount: DataTypes.DOUBLE
    },
    { timestamps: false, freezeTableName: true }
  );
  return contractTrans;
};
