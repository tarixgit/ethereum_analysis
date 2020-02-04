("use strict");
// import typeDefs from "./schema/schema";
// import resolvers from "./resolvers/mainResolver";
const { ApolloServer, gql } = require("apollo-server-hapi");
const Hapi = require("@hapi/hapi");
const routes = require("./server/routes");
const models = require("./models");
const typeDefs = require("./schema/schema");
const resolvers = require("./resolvers");

// TODO remove this on prod
const HOST = "localhost";
const PORT = 3001;

// Put together a schema
const server = new ApolloServer({
  typeDefs: gql(typeDefs),
  resolvers,
  context: { db: models },
  // origin: {
  //   requestTimeout: "50s"
  // }
  tracing: true
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

  await models.sequelize.sync();
  await app.start();
  console.log("Server running on %s", app.info.uri);
};

process.on("unhandledRejection", err => {
  console.log(err);
  process.exit(1);
});

init();
