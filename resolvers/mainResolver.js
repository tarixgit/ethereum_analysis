module.exports = {
  Query: {
    label: (parent, { id }, { db }, info) => db.label.findByPk(id),
    labels: (parent, args, { db, limit: lim }, info) =>
      db.label.findAll({
        limit: lim || 100
      }),
    block: (parent, { id }, { db }, info) => db.block.findOne(id),
    blocks: (parent, args, { db, limit: lim }, info) =>
      db.block.findAll({ limit: lim || 100 }),
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
  },

  Label: {
    addresses: (label, args, { db }) =>
      db.address.findAll({
        where: {
          labelId: label.id
        }
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
