module.exports = {
  Query: {
    transaction: (parent, { id, limit: lim }, { db }, info) =>
      db.transaction.findByPk(id, {
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        limit: lim || 100
      }),
    transactions: (parent, { limit: lim }, { db }, info) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        limit: lim || 100
      })
  },
  Transaction: {
    fromAddress: (transaction, args, { db }) =>
      db.address.findByPk(transaction.from),
    toAddress: (transaction, args, { db }) =>
      db.address.findByPk(transaction.to)
  }
};
