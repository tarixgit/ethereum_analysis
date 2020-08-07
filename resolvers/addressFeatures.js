const { Op } = require("sequelize");
const { map } = require("lodash");
const { updateFeatureForAddresses } = require("./buildFeaturesThread");

module.exports = {
  Query: {
    addressFeatures: (parent, { orderBy, addresses = null, limit: lim, offset, ids = null }, { db }, info) => {
      const whereOr = [];
      let order = null;
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
      if (orderBy && orderBy.length && orderBy[0]) {
        order = map(orderBy, order => [order.field, order.type]);
      }

      return db.address_feature.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim,
        order
      });
    },
    getAndCalculateAddressFeatures: async (parent, { address }, { db }, info) => {
      const addressFromDB = await db.address.findAll({ where: { hash: address } });
      const result = await updateFeatureForAddresses(addressFromDB, false, false);
      if (result.length && result[0]) {
        return result[0];
      }
      return new Error("Address not found");
    }
  }
};
