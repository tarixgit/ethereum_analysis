"use strict";

module.exports = function(sequelize, DataTypes) {
  const erc20tokenTransfer = sequelize.define(
    "erc20token_transfer",
    {
      name: DataTypes.STRING,
      color: DataTypes.STRING
    },
    { timestamps: false }
  );
  return erc20tokenTransfer;
};
