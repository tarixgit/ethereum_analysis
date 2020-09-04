const { Op } = require("sequelize");
const { map } = require("lodash");

module.exports = {
  Query: {
    logs: (parent, { orderBy, limit: lim, offset, ids = null }, { db }, info) => {
      const whereOr = [];
      let order = null;
      if (ids) {
        whereOr.push({ id: ids });
      }
      if (orderBy && orderBy.length && orderBy[0]) {
        order = map(orderBy, order => [order.field, order.type]);
      }
      if (lim === 0) {
        return db.log.findAndCountAll({
          where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
          order
        });
      }
      return db.log.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim,
        order
      });
    }
  }
};
