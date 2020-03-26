"use strict";

module.exports = function(sequelize, DataTypes) {
  const transactionFeature = sequelize.define(
    "transaction_feature",
    {
      scam: DataTypes.BOOLEAN,
      value: DataTypes.INTEGER,
      timestamp: DataTypes.INTEGER
      // targetAddress
    },
    {
      timestamps: false,
      freezeTableName: true
    }
  );
  transactionFeature.associate = models => {
    transactionFeature.belongsTo(models.transaction);
  };
  return transactionFeature;
};
