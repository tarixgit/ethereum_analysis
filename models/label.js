"use strict";

module.exports = function(sequelize, DataTypes) {
  const label = sequelize.define(
    "label",
    {
      name: DataTypes.STRING,
      color: DataTypes.STRING
    },
    {
      timestamps: false,
      freezeTableName: true
    }
  );
  label.associate = models => {
    label.belongsTo(models.address);
  };
  return label;
};
