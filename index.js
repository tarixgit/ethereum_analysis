("use strict");
// import typeDefs from "./schema/schema";
// import resolvers from "./resolvers/mainResolver";
const { ApolloServer, gql } = require("apollo-server-hapi");
const Hapi = require("@hapi/hapi");
const routes = require("./server/routes");
const models = require("./models");
const typeDefs = require("./schema/schema");
const resolvers = require("./resolvers");
const dotenv = require("dotenv");
const result = dotenv.config();

if (result.error) {
  throw result.error;
}

console.log(result.parsed);

const PORT = process.env.PORT;

// Put together a schema
//  TODO output the errors from Apollo Server
const server = new ApolloServer({
  typeDefs: gql(typeDefs),
  resolvers,
  context: { db: models },
  debug: true,
  // origin: {
  //   requestTimeout: "50s"
  // }
  tracing: !!process.env.PROD,
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      if (connectionParams) {
        console.log("WS conected with parameters:");
        console.log(connectionParams);
        return Promise.resolve();
      }

      throw new Error("Missing auth token!");
    }
  }
});

const app = Hapi.server({
  // host: HOST,
  port: PORT,
  routes: {
    timeout: {
      socket: false
    }
  }
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
