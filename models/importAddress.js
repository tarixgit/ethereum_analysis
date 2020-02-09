"use strict";

module.exports = function(sequelize, DataTypes) {
  const importAddress = sequelize.define(
    "import_address",
    {
      hash: DataTypes.STRING,
      name: DataTypes.STRING,
      url: DataTypes.STRING,
      coin: DataTypes.STRING,
      category: DataTypes.STRING,
      subcategory: DataTypes.STRING,
      reporter: DataTypes.STRING,
      status: DataTypes.STRING
    },
    {
      timestamps: false, // TODO change this
      freezeTableName: true
    }
  );
  return importAddress;
};
