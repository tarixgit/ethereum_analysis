module.exports = {
  /* Label: {
    addresses: (parent, args, context, info) => parent.getAddresses()
  },
  Address: {
    label: (parent, args, context, info) => {
      //
      return parent.getLabel();
    }
  }, */
  Query: {
    label: (parent, { id }, { db }, info) =>
      db.label.findByPk(id, { include: [{ model: db.address }] }),
    labels: (parent, args, { db, limit: lim }, info) =>
      db.label.findAll({
        include: [{ model: db.address }],
        limit: lim || 100
      }),

    address: (parent, { id }, { db }, info) =>
      db.address.findByPk(id, { include: [{ model: db.label }] }),
    addresses: (parent, args, { db, limit: lim }, info) =>
      db.address.findAll({ limit: lim || 100 }),

    block: (parent, { id }, { db }, info) => db.block.findOne(id),
    blocks: (parent, args, { db, limit: lim }, info) =>
      db.block.findAll({ limit: lim || 100 }),

    transaction: (parent, { id, limit: lim }, { db }, info) =>
      db.transaction.findByPk(id, {
        attributes: ["id", "bid", "tid", "from", "to"],
        include: [
          { model: db.address, as: "fromAddress" },
          { model: db.address, as: "toAddress" }
        ],
        limit: lim || 100
      }),
    transactions: (parent, args, { db, limit: lim }, info) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to"],
        include: [
          { model: db.address, as: "fromAddress", foreignKey: "from" },
          { model: db.address, as: "toAddress", foreignKey: "to" }
        ],
        limit: lim || 100
      }),

    contractTransaction: (parent, { id, limit: lim }, { db }, info) =>
      db.contract_trans.findByPk(id, {
        include: [{ model: db.contract_trans_type }],
        limit: lim || 100
      }),
    contractTransactions: (parent, args, { db, limit: lim }, info) =>
      db.contract_trans.findAll({
        limit: lim || 100,
        include: [{ model: db.contract_trans_type }]
      }),

    contractTransType: (parent, { id, limit: lim }, { db }, info) =>
      db.contract_trans_type.findByPk(id, {
        include: [{ model: db.contract_trans }],
        limit: lim || 100
      }),
    contractTransTypes: (parent, args, { db, limit: lim }, info) =>
      db.contract_trans_type.findAll({
        limit: lim || 100,
        include: [{ model: db.contract_trans }]
      })
  }

  // db.address.findByPk(id, { include:  db.label }),

  /* Mutation: {
        createPost: (parent, { title, content, authorId }, { db }, info) =>
            db.post.create({
                title: title,
                content: content,
                authorId: authorId
            }),
        updatePost: (parent, { title, content, id }, { db }, info) =>
            db.post.update({
                    title: title,
                    content: content
                },
                {
                    where: {
                        id: id
                    }
                }),
        deletePost: (parent, {id}, { db }, info) =>
            db.post.destroy({
                where: {
                    id: id
                }
            })
    } */
};
