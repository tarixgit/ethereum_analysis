"use strict";

module.exports = function(sequelize, DataTypes) {
  const addressFeature = sequelize.define(
    "address_feature",
    {
      hash: DataTypes.STRING,
      scam: DataTypes.BOOLEAN,
      numberOfNone: DataTypes.INTEGER,
      numberOfOneTime: DataTypes.INTEGER,
      numberOfExchange: DataTypes.INTEGER,
      numberOfMiningPool: DataTypes.INTEGER,
      numberOfMiner: DataTypes.INTEGER,
      numberOfSmContract: DataTypes.INTEGER,
      numberOfERC20: DataTypes.INTEGER,
      numberOfERC721: DataTypes.INTEGER,
      numberOfTrace: DataTypes.INTEGER,
      medianOfEthProTrans: DataTypes.DOUBLE,
      averageOfEthProTrans: DataTypes.DOUBLE
    },
    {
      timestamps: false,
      freezeTableName: true
    }
  );
  addressFeature.associate = models => {
    addressFeature.belongsTo(models.address);
  };
  return addressFeature;
};
