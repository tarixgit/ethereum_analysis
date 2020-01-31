module.exports = `
  type Address {
    id: ID!
    hash: String!,
    alias: String,
    degree: Int,
    outdegree: Int,
    scam: Boolean,
    label: Label!
    transactions: [Transaction!]!
    transactionsOutput: [Transaction!]
    transactionsInput: [Transaction!]
  }
  type Block {
    id: ID!
    miner: Int!,
    timestamp: String,
    rate: Float,
    reward: Int,
  }
   type Transaction {
    id: ID!
    bid: Int,
    tid: Int,
    fromAddress: Address!,
    toAddress: Address!,
    amount: Float,
  }
  type ContractTrans {
    id: ID!,
    cid: String!,
    bid: Int,
    tid: Int,
    i: Int,
    contractTransType: ContractTransType!,
    to: Int,
    amount: Float,
  }
  type Label {
    id: ID!
    name: String
    color: String!
    addresses: [Address!]!
  }
  type ContractTransType {
    id: ID!
    name: String
    contractTrans: [ContractTrans!]!
  }
  type Query {
    address(id: ID!, address: String): Address!
    addresses(limit: Int): [Address!]!
    label(id: ID!): Label!
    labels(limit: Int): [Label!]!
    block(id: ID!): Block!
    blocks(limit: Int): [Block!]!
    contractTransaction(id: ID!): ContractTrans!
    contractTransactions(limit: Int): [ContractTrans!]!
    contractTransType(id: ID!): ContractTransType!
    contractTransTypes(limit: Int): [ContractTransType!]!
    transaction(id: ID!, address: String, fromAddress: String, toAddress: String ): Transaction!
    transactions(limit: Int, ids: ID, fromAddress: ID, toAddress: ID ): [Transaction!]!
  }
`;

/*

schema {
  query: Query
}

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
