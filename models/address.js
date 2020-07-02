"use strict";

module.exports = function(sequelize, DataTypes) {
  const address = sequelize.define(
    "address",
    {
      hash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      alias: DataTypes.STRING,
      degree: DataTypes.INTEGER,
      outdegree: DataTypes.INTEGER,
      scam: DataTypes.BOOLEAN
    },
    {
      timestamps: false,
      freezeTableName: true
    }
  );
  address.associate = models => {
    address.belongsTo(models.label);
    address.hasMany(models.transaction);
    address.hasOne(models.address_feature);
  };
  return address;
};
//
// {as: 'role'}
// {foreignKey: 'fk_companyname', targetKey: 'name'}
// const DataLoader = require('dataloader')
