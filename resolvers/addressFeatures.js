const { Op } = require("sequelize");
const { buildFeatureForAddresses } = require("./utils");

module.exports = {
  Query: {
    addressFeatures: (
      parent,
      { addresses = null, limit: lim, offset, ids = null },
      { db },
      info
    ) => {
      const whereOr = [];
      // TODO keyed Obj map
      if (addresses) {
        whereOr.push({ hash: addresses });
      }
      if (ids) {
        whereOr.push({ id: ids });
      }
      if (lim === 0) {
        return db.address_feature.findAndCountAll({
          where: whereOr.length ? { [Op.or]: [...whereOr] } : null
        });
      }
      return db.address_feature.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim
      });
    },
    getAndCalculateAddressFeatures: async (
      parent,
      { address },
      { db },
      info
    ) => {
      const result = await buildFeatureForAddresses(
        db,
        [{ hash: address }],
        true
      );
      if (result.length && result[0]) {
        return result[0];
      }
      return new Error("Address not found");
    }
  }
};
