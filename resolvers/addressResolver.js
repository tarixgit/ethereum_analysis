const { uniq, difference } = require("lodash");

// TODO try to use globalModel
// let globalModel = null;

module.exports = {
  Query: {
    findNeighborsScam: async (
      parent,
      { address, limit: lim },
      { db },
      info
    ) => {
      const firstAddress = await db.address.findOne({
        where: { hash: address },
        limit: lim || 100
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
      // const tree = { id: firstAddress.id, pathToFather: [], children: [] };
      const found = await findScammer(
        [firstAddress.id],
        db,
        maxDepth,
        checkedAddress
      );
      console.log(found);
      return found
        ? {
            nodes: [{ id: 0, label: "found", group: "000" }],
            edges: [{ from: "1", to: "2" }]
          }
        : {
            nodes: [{ id: 111, label: "not found", group: "111" }],
            edges: [{ from: "11", to: "11" }]
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

const findScammer = async (inputIds, db, maxDepth, checkedAddress) => {
  // first try to go only out
  // create clever variable(object) to store the path
  console.log("------");
  console.log("------");
  console.log("Start");
  console.log(maxDepth);
  if (maxDepth <= 0) {
    return Promise.resolve("error: max depth arrive");
  }

  // the next btach call because of weak Database server
  const batchSize = 4;
  const batchCount = Math.ceil(inputIds.length / batchSize);
  let result = [];
  for (let i = 0; i < batchCount; i++) {
    const batch = await db.transaction.findAll({
      attributes: ["id", "from", "to"],
      where: {
        from: inputIds.slice(i * batchSize, (i + 1) * batchSize)
      },
      raw: true
    });
    // todo add diff here
    result = result.concat(batch);
  }
  const trans = result;

  // tree
  const ids = uniq(trans.map(({ to }) => to));
  const newAddress = difference(ids, checkedAddress); // todo you can output the addresses
  checkedAddress = checkedAddress.concat(newAddress);

  const addresses = await db.address_feature.findAll({
    attributes: ["id", "addressId", "scam"],
    where: { addressId: newAddress }
  });
  const found = addresses.find(({ scam }) => scam);
  if (found) {
    console.log(found);
    return found;
  } else {
    return findScammer(ids, db, maxDepth - 1, checkedAddress);
  }
};
