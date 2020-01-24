"use strict";

module.exports = function(sequelize, DataTypes) {
  const transaction = sequelize.define(
    "transaction",
    {
      bid: DataTypes.INTEGER,
      tid: DataTypes.INTEGER,
      // from: DataTypes.INTEGER,
      // to: DataTypes.INTEGER,
      amount: DataTypes.DOUBLE
    },
    { timestamps: false, freezeTableName: true }
  );
  transaction.associate = models => {
    transaction.belongsTo(models.address, {
      as: "fromAddress",
      foreignKey: "from"
    });
    transaction.belongsTo(models.address, {
      as: "toAddress",
      foreignKey: "to"
    });
  };
  return transaction;
};
