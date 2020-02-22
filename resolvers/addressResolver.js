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
          $or: [{ from: address.id }, { to: address.id }]
        },
        raw: true
      }),
    transactionsOutput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        // include: [  TODO GraphQL didn't take nested obj
        //   {
        //     model: db.address,
        //     as: "toAddress"
        //   }
        // ],
        where: {
          from: address.id
        },
        raw: true
      }),
    transactionsInput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        // include: [
        //   {
        //     model: db.address,
        //     as: "fromAddress"
        //   }
        // ],
        where: {
          to: address.id
        },
        raw: true
      }),
    label: ({ labelId }, args, { db }) => db.label.findByPk(labelId)
  }
};
