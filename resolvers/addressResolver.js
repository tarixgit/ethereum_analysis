module.exports = {
  Query: {
    address: (parent, { id }, { db }, info) => db.address.findByPk(id),
    addresses: (parent, { address, limit: lim }, { db }, info) =>
      db.address.findAll({
        where: { hash: address },
        limit: lim || 100
      })
  },
  Address: {
    transactions: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          [db.Op.or]: [{ from: address.id }, { to: address.id }]
        }
      }),
    transactionsOutput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          from: address.id
        }
      }),
    transactionsInput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          to: address.id
        }
      }),
    label: ({ labelId }, args, { db }) => db.label.findByPk(labelId)
  }
};
