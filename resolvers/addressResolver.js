module.exports = {
  Query: {
    address: (parent, { id }, { db }, info) =>
      db.address.findByPk(id, { include: [{ model: db.label }] }),
    addresses: (parent, args, { db, limit: lim }, info) =>
      db.address.findAll({ limit: lim || 100 })
  },
  Address: {
    transactions: (address, args, { db }) =>
      db.transaction.findAll({
        where: {
          [db.Op.or]: [{ from: address.id }, { to: address.id }]
        }
      }),
    label: ({ labelId }, args, { db }) => db.label.findByPk(labelId)
  }
};
