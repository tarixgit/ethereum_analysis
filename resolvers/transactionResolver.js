module.exports = {
  Query: {
    transaction: (parent, { id, limit: lim }, { db }, info) =>
      db.transaction.findByPk(id, {
        attributes: ["id", "bid", "tid", "from", "to"],
        limit: lim || 100
      }),
    transactions: (parent, args, { db, limit: lim }, info) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to"],
        limit: lim || 100
      })
  },
  Transaction: {
    fromAddress: (transaction, args, { db }) =>
      db.address.findAll({
        where: {
          id: transaction.from
        }
      }),
    toAddress: (transaction, args, { db }) =>
      db.address.findAll({
        where: {
          id: transaction.to
        }
      })
  }
};
