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
    label: (parent, { id }, { db }, info) => db.label.findByPk(id),
    labels: (parent, args, { db }, info) => db.label.findAll(),
    address: (parent, { id }, { db }, info) =>
      db.address.findByPk(id, { include: [{ model: db.label }] }),
    addresses: (parent, args, { db }, info) => db.address.findAll(),
    block: (parent, { id }, { db }, info) => db.block.findOne(id),
    blocks: (parent, args, { db }, info) => db.block.findAll(),
    contract_transaction: (parent, { id }, { db }, info) =>
      db.contract_trans.findAll({
        attributes: ["cid", "bid", "tid", "i", "type", "to", "amount"],
        where: { i: id }
      }),
    contract_transactions: (parent, args, { db }, info) =>
      db.contract_trans.findAll()
  }

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
