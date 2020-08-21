module.exports = `
  type Address {
    id: ID!
    hash: String!,
    alias: String,
    degree: Int,
    outdegree: Int,
    labelId: Int,
    scam: Boolean,
    label: Label!
    transactions: [Transaction]
    transactionsOutput: [Transaction]
    transactionsInput: [Transaction]
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
  type ImportAddress {
      id: ID!
      hash: String,
      name: String,
      url: String,
      coin: String,
      category: String,
      subcategory: String,
      reporter: String,
      status: String
      scam: Boolean,
  }
  type AddressFeature {
      id: ID!,
      hash: String,
      scam: Boolean,
      numberOfNone: Int,
      numberOfOneTime: Int,
      numberOfExchange: Int,
      numberOfMiningPool: Int,
      numberOfMiner: Int,
      numberOfSmContract: Int,
      numberOfERC20: Int,
      numberOfERC721: Int,
      numberOfTrace: Int,
      numberOfTransactions: Int,
      numberOfTransInput: Int,
      numberOfTransOutput: Int,
      medianOfEthProTrans: Float,
      averageOfEthProTrans: Float,
      numberOfNoneInput: Int,
      numberOfOneTimeInput: Int,
      numberOfExchangeInput: Int,
      numberOfMiningPoolInput: Int,
      numberOfMinerInput: Int,
      numberOfSmContractInput: Int,
      numberOfERC20Input: Int,
      numberOfERC721Input: Int,
      numberOfTraceInput: Int,
      transInputMedian: Float,
      transOutputMedian: Float,
      transInputAverage: Float,
      transOutputAverage: Float,
      minEth: Float,
      maxEth: Float,
      transInputMinEth: Float,
      transInputMaxEth: Float,
      transOutputMinEth: Float,
      transOutputMaxEth: Float,
      transInputMedianEth: Float,
      transInputAverageEth: Float,
      transOutputMedianMinEth: Float,
      transOutputAverageEth: Float,
      numberOfScamNeighbor: Int,
      numberOfScamNeighborInput: Int,
      numberOfNoneTr: Int,
      numberOfOneTimeTr: Int,
      numberOfExchangeTr: Int,
      numberOfMiningPoolTr: Int,
      numberOfMinerTr: Int,
      numberOfSmContractTr: Int,
      numberOfERC20Tr: Int,
      numberOfERC721Tr : Int,
      numberOfTraceTr: Int,
      addresses: Address!
  }
  type AddressFeatureCalc {      
      hash: String,
      numberOfNone: Int,
      numberOfOneTime: Int,
      numberOfExchange: Int,
      numberOfMiningPool: Int,
      numberOfMiner: Int,
      numberOfSmContract: Int,
      numberOfERC20: Int,
      numberOfERC721: Int,
      numberOfTrace: Int,
      numberOfTransactions: Int,
      numberOfTransInput: Int,
      numberOfTransOutput: Int,
      medianOfEthProTrans: Float,
      averageOfEthProTrans: Float,
      numberOfNoneInput: Int,
      numberOfOneTimeInput: Int,
      numberOfExchangeInput: Int,
      numberOfMiningPoolInput: Int,
      numberOfMinerInput: Int,
      numberOfSmContractInput: Int,
      numberOfERC20Input: Int,
      numberOfERC721Input: Int,
      numberOfTraceInput: Int,
      transInputMedian: Float,
      transOutputMedian: Float,
      transInputAverage: Float,
      transOutputAverage: Float,
      minEth: Float,
      maxEth: Float,
      transInputMinEth: Float,
      transInputMaxEth: Float,
      transOutputMinEth: Float,
      transOutputMaxEth: Float,
      transInputMedianEth: Float,
      transInputAverageEth: Float,
      transOutputMedianMinEth: Float,
      transOutputAverageEth: Float,
      numberOfScamNeighbor: Int,
      numberOfScamNeighborInput: Int,      
      addresses: Address!
  }
  type TransactionFeature {
      id: ID!,
      to: Int,
      amount: Float,
      timestamp: String,
      scam: Boolean,
  }
  type Node {
   id: Int!, 
   label: String, 
   group: Int!, 
   shape: String
   main: Boolean
  }
  type Edge {
   from: Int,
   to: Int,  
  }
  type Graph {
   nodes: [Node!]!
   edges: [Edge]!
   error: String
  }
  type Log {
    id: Int!, 
    name: String
    description: String
    createdAt: String
    data: Graph
  }
  type ImportAddressesWCount {
    rows: [ImportAddress!]!
    count: Int
  } 
   type AddressFeaturesWCount {
    rows: [AddressFeature!]!
    count: Int
  }
  type Logs {
    rows: [Log]!
    count: Int
  }
  type UpdateState {
    lastAddress: Int!
    lastBlock: Int!
    lastTransaction: Int!
  }
  type MessageNotify {
      message: String!
  }
  input Order {
      field: String
      type: String
  }
  input ImportAddressInput {      
      hash: String!,
      name: String,
      url: String,
      coin: String,
      category: String,
      subcategory: String,
      reporter: String,
      status: String
      scam: Boolean!,
  }
  type Query {
    address(id: ID!): Address!
    addresses(limit: Int, address: String): [Address!]!
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
    importAddress(id: ID!): ImportAddress!
    importAddresses(orderBy: [Order], offset: Int, limit: Int, ids: [ID], addresses: [String]): ImportAddressesWCount!
    addressFeatures(orderBy: [Order], offset: Int, limit: Int, ids: [ID], addresses: [String]): AddressFeaturesWCount!
    logs(orderBy: [Order], offset: Int, limit: Int, ids: [ID], addresses: [String]): Logs!
    getAndCalculateAddressFeatures(address: String!): AddressFeatureCalc!
    transactionFeatures: [TransactionFeature!]!
    findNeighborsScam(address: String!, level: Int, direction: Int): Graph!
    getUpdateState: UpdateState!
  }
  type Mutation {
    addAddressToImport(address: ImportAddressInput!): GeneralResponse!
    deleteAddressToImport(id: Int): GeneralResponse!
    findNeighborsScamThread(address: String!, level: Int, direction: Int): GeneralResponse!
    loadData: GeneralResponse!
    buildFeatures: GeneralResponse!
    recalcFeatures: GeneralResponse!
    buildFeaturesThread: GeneralResponse!
    recalcFeaturesThread: GeneralResponse!
    updateDataFromBlockchain: GeneralResponse!
    importLabelFromEther(type: Int): GeneralResponse!
    updateLabelsOnAddress(from: Int, to: Int): GeneralResponse!
    login(email: String): String # login token
  }
  type GeneralResponse {
      success: Boolean!
      message: String
  }
  type Subscription {
    neighborsScamFounded: Graph
    messageNotify: MessageNotify!
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
