"use strict";

module.exports = function(sequelize, DataTypes) {
  const block = sequelize.define(
    "block",
    {
      miner: DataTypes.INTEGER,
      timestamp: DataTypes.STRING,
      rate: DataTypes.DOUBLE,
      reward: DataTypes.INTEGER
    },
    { timestamps: false, freezeTableName: true }
  );
  return block;
};
