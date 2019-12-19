("use strict");

const { ApolloServer } = require("apollo-server-hapi");
const Hapi = require("@hapi/hapi");
const routes = require("./server/routes");

const HOST = "localhost";
const PORT = 3000;

// Some fake data
const books = [
  {
    title: "Harry Potter and the Sorcerer's stone",
    author: "J.K. Rowling"
  },
  {
    title: "Jurassic Park",
    author: "Michael Crichton"
  }
];

// The GraphQL schema in string form
const typeDefs = `
  type Query { books: [Book] }
  type Book { title: String, author: String }
`;

// The resolvers
const resolvers = {
  Query: { books: () => books }
};

// Put together a schema
const server = new ApolloServer({
  typeDefs,
  resolvers
});

const app = Hapi.server({
  host: HOST,
  port: PORT
});

const init = async () => {
  await server.applyMiddleware({
    app
  });
  await server.installSubscriptionHandlers(app.listener);

  app.route(routes);

  await app.start();
  console.log("Server running on %s", app.info.uri);
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();
