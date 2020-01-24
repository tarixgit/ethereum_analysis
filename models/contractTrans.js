"use strict";

module.exports = function(sequelize, DataTypes) {
  const contractTransaction = sequelize.define(
    "contract_trans",
    {
      cid: DataTypes.STRING,
      bid: DataTypes.INTEGER,
      tid: DataTypes.INTEGER, // smallint
      i: DataTypes.INTEGER,
      contractTransTypeId: DataTypes.INTEGER, // smallint
      to: DataTypes.INTEGER,
      amount: DataTypes.DOUBLE
    },
    { timestamps: false, freezeTableName: true }
  );
  contractTransaction.associate = models => {
    contractTransaction.belongsTo(models.contract_trans_type);
  };

  return contractTransaction;
};
