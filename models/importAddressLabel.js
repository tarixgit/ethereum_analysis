"use strict";

module.exports = function(sequelize, DataTypes) {
  const importAddressLabel = sequelize.define(
    "import_address_label",
    {
      hash: DataTypes.STRING,
      name: DataTypes.STRING,
      symbol: DataTypes.STRING,
      category: DataTypes.STRING
    },
    {
      freezeTableName: true
    }
  );
  importAddressLabel.associate = models => {
    importAddressLabel.belongsTo(models.label);
  };
  return importAddressLabel;
};
