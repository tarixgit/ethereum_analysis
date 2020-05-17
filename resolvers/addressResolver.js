const {
  groupBy,
  differenceWith,
  find,
  flatMap,
  map,
  uniqBy,
  take
} = require("lodash");
const { PubSub } = require("apollo-server");
const pubsub = new PubSub();

const FOUND_NEIGHBOR = "foundNeighborStr";
const MESSAGE = "message";
// TODO try to use globalModel
// let globalModel = null;

module.exports = {
  Subscription: {
    neighborsScamFounded: {
      resolve: payload => {
        return {
          customData: payload
        };
      },
      subscribe: () => pubsub.asyncIterator(FOUND_NEIGHBOR)
    },
    message: {
      resolve: payload => {
        return {
          customData: payload
        };
      },
      subscribe: () => pubsub.asyncIterator(MESSAGE)
    }
  },
  Query: {
    findNeighborsScam: async (
      parent,
      { address, limit: lim },
      { db },
      info
    ) => {
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
      pubsub.publish(FOUND_NEIGHBOR, { messg: "Step", step: maxDepth });
      const foundPath = await findScammer(
        childrensArr,
        db,
        maxDepth,
        checkedAddress
      );
      // do return,
      // make async fuction, aber ohne await
      if (typeof foundPath === "string") {
        return {
          nodes: [{ id: 111, label: "stared", group: "111" }],
          edges: [{ from: "11", to: "11" }],
          error: foundPath
        };
      }
      // because of memory leak, make one more Query for data asking
      const addressesPath = await db.address.findAll({
        where: { id: foundPath }
      });
      return {
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

const findScammer = async (parentArr, db, maxDepth, checkedAddress) => {
  // first try to go only out
  // create clever variable(object) to store the path
  if (maxDepth <= 0) {
    return Promise.resolve("error: max depth arrive");
  }
  pubsub.publish(FOUND_NEIGHBOR, { messg: "Step", step: maxDepth });
  // the next batch call because of weak Database server
  // const batchSize = 4;
  // const batchCount = Math.ceil(inputIds.length / batchSize);
  // let result = [];
  // for (let i = 0; i < batchCount; i++) {
  //   const batch = await db.transaction.findAll({
  //     attributes: ["id", "from", "to"],
  //     where: {
  //       from: inputIds.slice(i * batchSize, (i + 1) * batchSize)
  //     },
  //     raw: true
  //   });
  //   // todo add diff here
  //   result = result.concat(batch);
  // }
  const parentIds = map(parentArr, arr => arr[arr.length - 1]);
  const trans = await db.transaction.findAll({
    attributes: ["id", "from", "to"],
    where: {
      from: parentIds
    },
    raw: true
  });

  // performance?
  // remove cricles
  const transFiltered = differenceWith(
    trans,
    checkedAddress,
    (valueNew, valueOld) => valueNew.to === valueOld
  );

  // build paths
  const transGrouped = groupBy(transFiltered, "from");
  const newChildrenArray = flatMap(parentArr, pathToParent => {
    const parent = pathToParent[pathToParent.length - 1]; // is the same as transGrouped.key, iterate transGrouped.from
    let oneParentMoreChildrens = transGrouped[parent];
    oneParentMoreChildrens = uniqBy(oneParentMoreChildrens, "to"); // not good, if need sum of amout
    return map(oneParentMoreChildrens, item => [...pathToParent, item.to]);
  });
  const childrensIds = map(newChildrenArray, arr => arr[arr.length - 1]);
  checkedAddress = checkedAddress.concat(childrensIds);
  // const ids = uniq(trans.map(({ to }) => to));
  // const newAddress = difference(ids, checkedAddress); // todo you can output the addresses
  // checkedAddress = checkedAddress.concat(newAddress);

  const addresses = await db.address_feature.findAll({
    attributes: ["id", "addressId", "scam"],
    where: { addressId: childrensIds }
  });
  const foundScamAddress = find(addresses, ({ scam }) => scam);
  if (foundScamAddress) {
    console.log(foundScamAddress);
    const pathToScam = find(
      newChildrenArray,
      path => path[path.length - 1] === foundScamAddress.addressId
    );
    console.log(pathToScam);
    return pathToScam;
  } else {
    return findScammer(newChildrenArray, db, maxDepth - 1, checkedAddress);
  }
};
