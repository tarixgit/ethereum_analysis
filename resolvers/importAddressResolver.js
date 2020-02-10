const { Op } = require("sequelize");

module.exports = {
  Query: {
    importAddress: (parent, { id }, { db }, info) =>
      db.import_address.findByPk(id),
    importAddresses: (
      parent,
      { addresses = null, limit: lim, ids = null },
      { db },
      info
    ) => {
      const whereOr = [];
      if (addresses) {
        whereOr.push({ hash: addresses });
      }
      if (ids) {
        whereOr.push({ id: ids });
      }
      return db.import_address.findAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        limit: lim || 100
      });
    }
  }
};
