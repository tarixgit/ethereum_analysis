// const models = require("../models");

export default {
  Label: {
    labels: (parent, args, context, info) => parent.getLabels()
  },
  Query: {
    label: (parent, args, { db }, info) => db.label.findAll(),
    labels: (parent, { id }, { db }, info) => db.label.findById(id)
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
