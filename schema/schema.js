module.exports = `
  type Address {
    id: ID!
    hash: String!,
    alias: String,
    degree: Int,
    outdegree: Int,
    scam: Boolean,
    label: Label!
  }
  type Block {
    id: ID!
    miner: Int!,
    timestamp: String,
    rate: Float,
    reward: Int,
  }
  type ContractTrans {
    id: ID!,
    cid: String!,
    bid: Int,
    tid: Int,
    i: Int,
    type: Int,
    to: Int,
    amount: Float,
  }
  type Label {
    id: ID!
    name: String
    color: String!
    addresses: [Address!]!
  }
  type Query {
    address(id: ID!): Address!
    addresses: [Address!]!
    label(id: ID!): Label!
    labels: [Label!]!
    block(id: ID!): Block!
    blocks: [Block!]!
    contract_transaction(id: ID!): ContractTrans!
    contract_transactions: [ContractTrans!]!
    
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
