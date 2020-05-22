const { Op } = require("sequelize");
const { map } = require("lodash");

module.exports = {
  Query: {
    importAddress: (parent, { id }, { db }, info) =>
      db.import_address.findByPk(id),

    importAddresses: (
      parent,
      { orderBy, addresses = null, limit: lim, offset, ids = null },
      { db },
      info
    ) => {
      const whereOr = [];
      let order = null;
      if (addresses) {
        whereOr.push({ hash: addresses });
      }
      if (ids) {
        whereOr.push({ id: ids });
      }
      if (orderBy && orderBy.length && orderBy[0]) {
        order = map(orderBy, order => [order.field, order.type]);
      }

      return db.import_address.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim || 100,
        order
      });
    }
  }
};
