// const { Op } = require("sequelize");
const { map, uniq, keyBy } = require("lodash");

module.exports = {
  Query: {
    transactionFeatures: async (parent, _, { db }, info) => {
      const addresses = await db.address_feature.findAll();
      const ids = map(addresses, "addressId");
      const addressesKeyed = keyBy(addresses, "id");
      let transactions = await db.transaction.findAll({
        attributes: ["id", "bid", "from", "to", "amount"], // do we need this?
        where: {
          to: ids
        },
        raw: true
      });
      const blockIds = uniq(map(transactions, "bid"));
      const blocks = await db.block.findAll({
        where: { id: blockIds },
        raw: true
      });
      const blocksKeyed = keyBy(blocks, "id");
      transactions = map(transactions, item => {
        item.timestamp = blocksKeyed[item.bid].timestamp;
        item.scam = addressesKeyed[item.to].scam;
        return item;
      });

      return transactions;
    }
  }
};
