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
      numberOfNoneInput: DataTypes.INTEGER,
      numberOfOneTimeInput: DataTypes.INTEGER,
      numberOfExchangeInput: DataTypes.INTEGER,
      numberOfMiningPoolInput: DataTypes.INTEGER,
      numberOfMinerInput: DataTypes.INTEGER,
      numberOfSmContractInput: DataTypes.INTEGER,
      numberOfERC20Input: DataTypes.INTEGER,
      numberOfERC721Input: DataTypes.INTEGER,
      numberOfTraceInput: DataTypes.INTEGER,
      medianOfEthProTrans: DataTypes.DOUBLE,
      averageOfEthProTrans: DataTypes.DOUBLE,
      transInputMedian: DataTypes.DOUBLE,
      transOutputMedian: DataTypes.DOUBLE,
      transInputAverage: DataTypes.DOUBLE,
      transOutputAverage: DataTypes.DOUBLE,
      numberOfTransactions: DataTypes.INTEGER,
      numberOfTransInput: DataTypes.INTEGER,
      numberOfTransOutput: DataTypes.INTEGER,
      minEth: DataTypes.DOUBLE,
      maxEth: DataTypes.DOUBLE,
      transInputMinEth: DataTypes.DOUBLE,
      transInputMaxEth: DataTypes.DOUBLE,
      transOutputMinEth: DataTypes.DOUBLE,
      transOutputMaxEth: DataTypes.DOUBLE,
      transInputMedianEth: DataTypes.DOUBLE,
      transInputAverageEth: DataTypes.DOUBLE,
      transOutputMedianMinEth: DataTypes.DOUBLE,
      transOutputAverageEth: DataTypes.DOUBLE,
      numberOfScamNeighbor: DataTypes.INTEGER,
      numberOfScamNeighborInput: DataTypes.INTEGER,
      numberOfNoneTr: DataTypes.INTEGER,
      numberOfOneTimeTr: DataTypes.INTEGER,
      numberOfExchangeTr: DataTypes.INTEGER,
      numberOfMiningPoolTr: DataTypes.INTEGER,
      numberOfMinerTr: DataTypes.INTEGER,
      numberOfSmContractTr: DataTypes.INTEGER,
      numberOfERC20Tr: DataTypes.INTEGER,
      numberOfERC721Tr: DataTypes.INTEGER,
      numberOfTraceTr: DataTypes.INTEGER
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
