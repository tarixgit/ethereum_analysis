const { pubsub } = require("./pubsub");
const { flatten, map, take, isArray, isEmpty } = require("lodash");
const { fork } = require("child_process");
const path = require("path");
const { findScammer } = require("./utils/utils");
const { addLog } = require("./utils");

const debugMode = typeof v8debug === "object" || /--debug|--inspect/.test(process.execArgv.join(" "));
const FOUND_NEIGHBOR = "foundNeighborStr";
const MESSAGE = "message";

module.exports = {
  Subscription: {
    neighborsScamFounded: {
      subscribe: () => pubsub.asyncIterator(FOUND_NEIGHBOR)
    },
    messageNotify: {
      subscribe: () => pubsub.asyncIterator(MESSAGE) // todo use to recieve messg from frontend to break the calc
    }
  },
  Mutation: {
    addAddressToImport: async (parent, { address }, { db }, info) => {
      await db.import_address.findOrCreate({ where: { hash: address.hash }, defaults: address });
      return {
        success: true,
        message: "Address added"
      };
    },
    findNeighborsScamThread: async (parent, { address, level }, { db }, info) => {
      const firstAddress = await db.address.findOne({
        where: { hash: address }
      });
      const maxDepth = level || 3;
      const checkedAddress = [firstAddress.id];
      const childrensArr = [[firstAddress.id]];

      const port = Math.floor(Math.random() * (65000 - 20000) + 20000);
      const forked = fork(
        path.join(__dirname, "searchNeighborScamThread.js"),
        [],
        debugMode
          ? {
              execArgv: ["--inspect-brk=" + port]
            }
          : {}
      );
      forked.on("message", async ({ foundPaths, msg = null }) => {
        console.log(foundPaths);
        if (!isEmpty(msg)) {
          addLog("searchNeighborScamThread", msg);
          pubsub.publish(MESSAGE, { messageNotify: { message: msg } });
        }
        if (foundPaths && isArray(foundPaths) && isArray(foundPaths[0])) {
          const addressesFromPaths = await db.address.findAll({
            where: { id: flatten(foundPaths) }
          });
          const answer = {
            nodes: map(addressesFromPaths, ({ id, hash, labelId, scam, alias }) =>
              scam
                ? {
                    id,
                    label: alias || hash,
                    group: labelId,
                    shape: "star"
                  }
                : {
                    id,
                    label: alias || hash,
                    group: labelId
                  }
            ),
            edges: flatten(
              map(foundPaths, path =>
                map(take(path, path.length - 1), (id, index) => ({
                  from: id,
                  to: path[index + 1]
                }))
              )
            )
          };
          addLog("searchNeighborScamThread", "Recieved result", answer);
          pubsub.publish(FOUND_NEIGHBOR, { neighborsScamFounded: answer });
        }
      });
      forked.on("exit", async status => {
        await addLog("searchNeighborScamThread", `Searching process in thread stopped with code: ${status}`);
        if (status) {
          pubsub.publish(MESSAGE, {
            messageNotify: {
              message: "Error by searching scam neighbors"
            }
          });
        } else {
          pubsub.publish(MESSAGE, {
            messageNotify: {
              message: "Searching process ends successful"
            }
          });
        }
      });
      await addLog("searchNeighborScamThread", `child pid: ${forked.pid}`);
      await addLog("searchNeighborScamThread", `Address: ${address}`);
      forked.send({
        childrensArr,
        maxDepth,
        checkedAddress
      });
      return {
        success: true,
        message: "Searching running"
      };
    }
  },
  Query: {
    // TODO not used!!!
    findNeighborsScam: async (parent, { address, limit: lim }, { db }, info) => {
      const firstAddress = await db.address.findOne({
        where: { hash: address }
      });
      /**
       *  Recursion mit memo ausprobeiren oder ein normales loop
       *  https://www.digitalocean.com/community/tutorials/js-understanding-recursion
       * 1. Get Transaktion
       * 2. Get Addresse
       * 3. Go to 1.
       *
       * 4. check addressFeature tabel. This must not be 0
       **/
      const maxDepth = 3;
      const checkedAddress = [firstAddress.id];
      // childrensArr is array of all possible path
      const childrensArr = [[firstAddress.id]];
      pubsub.publish(MESSAGE, { messageNotify: { message: "Started" } });
      const foundPath = await findScammer(childrensArr, db, maxDepth, checkedAddress);
      // do return,
      // todo make async fuction, aber ohne await
      let answer = {};
      if (typeof foundPath === "string") {
        answer = {
          nodes: [{ id: 111, label: "stared", group: "111" }],
          edges: [{ from: "11", to: "11" }],
          error: foundPath
        };
      }
      // because of memory leak, make one more Query for data asking
      const addressesPath = await db.address.findAll({
        where: { id: foundPath }
      });

      answer = {
        nodes: map(addressesPath, ({ id, hash, labelId }) => ({
          id,
          label: hash,
          group: labelId
        })),
        edges: map(take(foundPath, foundPath.length - 1), (id, index) => ({
          from: id,
          to: foundPath[index + 1]
        }))
      };
      pubsub.publish(FOUND_NEIGHBOR, { neighborsScamFounded: answer });
      return answer;
    },
    address: (parent, { id }, { db }, info) => db.address.findByPk(id),
    addresses: (parent, { address, limit: lim }, { db }, info) =>
      db.address.findAll({
        where: { hash: address },
        limit: lim || 100
      })
  },
  Address: {
    transactions: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          $or: [{ from: address.id }, { to: address.id }]
        },
        raw: true
      }),
    transactionsOutput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        // include: [  TODO GraphQL didn't take nested obj
        //   {
        //     model: db.address,
        //     as: "toAddress"
        //   }
        // ],
        where: {
          from: address.id
        },
        raw: true
      }),
    transactionsInput: (address, args, { db }) =>
      db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        // include: [
        //   {
        //     model: db.address,
        //     as: "fromAddress"
        //   }
        // ],
        where: {
          to: address.id
        },
        raw: true
      }),
    label: ({ labelId }, args, { db }) => db.label.findByPk(labelId)
  }
};
