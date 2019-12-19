export default `
  type Label {
    id: ID!
    label: String!
    color: String!
  }
  type Query {
    label: [Label!]!
    label(id: ID!): Label
  }
`;

/*
type Post {
    id: ID!
        title: String
    content: String!
        authorId: ID!
        author: Author!
}
type Query {
    posts: [Post!]!
        post(id: ID!): Post
    author(id: ID!): Author
    authors: [Author!]!
}
type Mutation {
    createPost(title: String, content:String!, authorId: ID!): Post!
        updatePost(id: ID!, title: String, content:String!): [Int!]!
        deletePost(id: ID!): Int!
}
*/
