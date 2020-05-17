const { Op } = require("sequelize");

module.exports = {
  Query: {
    importAddress: (parent, { id }, { db }, info) =>
      db.import_address.findByPk(id),

    importAddresses: (
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

      return db.import_address.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim || 100
      });
    }
  }
};
