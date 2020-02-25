const { Op } = require("sequelize");

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
      return db.address_feature.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim || 100
      });
    }
  }
};
