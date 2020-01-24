"use strict";

module.exports = function(sequelize, DataTypes) {
  const contractTransType = sequelize.define(
    "contract_trans_type",
    {
      name: DataTypes.STRING
    },
    { timestamps: false, freezeTableName: true }
  );
  contractTransType.associate = models => {
    contractTransType.hasMany(models.contract_trans);
  };
  return contractTransType;
};
