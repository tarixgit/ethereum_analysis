const {
  countBy,
  filter,
  flatMap,
  map,
  differenceBy,
  uniqBy,
  groupBy,
  keyBy,
  sortBy,
  meanBy,
  concat,
  compact
} = require("lodash");
const rp = require("request-promise");

const options = {
  uri: "https://etherscamdb.info/api/scams/",
  headers: {
    "User-Agent": "Request-Promise"
  },
  json: true
};

module.exports = {
  Mutation: {
    // login: async (parent, { id }, { db }, info) => {
    //   const user = await dataSources.userAPI.findOrCreateUser({ email });
    //   if (user) return Buffer.from(email).toString("base64");
    // } findOrCreate
    loadData: async (parent, data, { db }, info) => {
      try {
        const results = await rp(options);

        if (results.success) {
          // prepare data
          const resultFiltered = filter(
            results.result,
            ({ addresses, coin }) => !!addresses && coin === "ETH"
          );
          // prepare data
          let importAddresses = flatMap(
            resultFiltered,
            ({
              addresses,
              name,
              url,
              coin,
              category,
              subcategory,
              reporter,
              status
            }) =>
              map(addresses, address => ({
                hash: address,
                name,
                url,
                coin,
                category,
                subcategory,
                reporter,
                status
              }))
          );

          const addressesFromDB = await db.import_address.findAll({
            where: { hash: map(importAddresses, "hash") }
          });
          importAddresses = differenceBy(
            importAddresses,
            addressesFromDB,
            "hash"
          );
          importAddresses = uniqBy(importAddresses, "hash");
          if (importAddresses.length) {
            await db.import_address.bulkCreate(importAddresses);
          }
          return {
            success: !!results,
            message: `Success! Loaded ${importAddresses.length} new Addresses`
          };
        }
        return {
          success: !!results,
          message: `Warning! Etherscamdb not answered.`
        };
      } catch (err) {
        console.log(err);
        return {
          success: !err,
          message: "error"
        };
      }
    },
    buildFeatures: async (parent, data, { db }, info) => {
      const scamAddresses = await db.import_address.findAll({
        attributes: ["id", "hash"],
        raw: true
      });
      const addressesAlreadyInDB = await db.address_feature.findAll({
        where: { hash: map(scamAddresses, "hash") } // not perfect but must be fast
      });
      const hashes = map(
        differenceBy(scamAddresses, addressesAlreadyInDB, "hash"),
        "hash"
      );
      const addresses = await db.address.findAll({
        attributes: ["id", "hash"],
        where: { hash: hashes },
        raw: true
      });
      const ids = map(addresses, "id");
      let transactionsInputs = await db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          to: ids
        },
        raw: true
      });
      const inputNeighborIds = map(transactionsInputs, "from");
      const inputNeighbors = await db.address.findAll({
        attributes: ["id", "labelId"],
        where: { id: inputNeighborIds },
        raw: true
      });
      const inputNeighborsKeyed = keyBy(inputNeighbors, "id");
      transactionsInputs = map(transactionsInputs, item => {
        item.fromAddress = inputNeighborsKeyed[item.from];
        return item;
      });

      let transactionsOutputs = await db.transaction.findAll({
        attributes: ["id", "bid", "tid", "from", "to", "amount"],
        where: {
          from: ids
        },
        raw: true
      });
      const outputNeighborIds = map(transactionsOutputs, "to");
      const outputNeighbors = await db.address.findAll({
        attributes: ["id", "labelId"],
        where: { id: outputNeighborIds },
        raw: true
      });
      const outputNeighborsKeyed = keyBy(outputNeighbors, "id");
      transactionsOutputs = map(transactionsOutputs, item => {
        item.toAddress = outputNeighborsKeyed[item.to];
        return item;
      });
      const transactionsInputsKeyed = groupBy(transactionsInputs, "to");
      const transactionsOutputsKeyed = groupBy(transactionsOutputs, "from");
      const fullAddresses = map(addresses, ({ id, hash }) => ({
        id,
        hash,
        transactionsInput: transactionsInputsKeyed[id],
        transactionsOutput: transactionsOutputsKeyed[id]
      }));

      const addressFeatures = map(fullAddresses, address =>
        getFeatureSet(address)
      );
      if (addressFeatures.length) {
        await db.address_feature.bulkCreate(addressFeatures);
      }
      return {
        success: !!addressFeatures,
        message: `Success`
      };
    }
  }
};

/**
 * 0 - none,
 * 3 - Onetime,
 * 6 - Exchange,
 * 1 - Mining pool,
 * 5 - Miner,
 * 2 - Smart Contract,
 * 7 - Erc20,
 * 8 - ERC721,
 * 4 - Trace,
 * 9 - Genesis
 * **/
const getFeatureSet = ({ id, hash, transactionsInput, transactionsOutput }) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  return {
    hash,
    addressId: id,
    scam: true,
    numberOfNone: inputCounters[0] || 0 + outputCounters[0] || 0,
    numberOfOneTime: inputCounters[3] || 0 + outputCounters[3] || 0,
    numberOfExchange: inputCounters[6] || 0 + outputCounters[6] || 0,
    numberOfMiningPool: inputCounters[1] || 0 + outputCounters[1] || 0,
    numberOfMiner: inputCounters[5] || 0 + outputCounters[5] || 0,
    numberOfSmContract: inputCounters[2] || 0 + outputCounters[2] || 0,
    numberOfERC20: inputCounters[7] || 0 + outputCounters[7] || 0,
    numberOfERC721: inputCounters[8] || 0 + outputCounters[8] || 0,
    numberOfTrace: inputCounters[4] || 0 + outputCounters[4] || 0,
    medianOfEthProTrans: median(fullArr, "amount"),
    averageOfEthProTrans: !fullArr.length ? 0 : meanBy(fullArr, "amount")
  };
};

const median = (array, field = "") => {
  array = sortBy(array, field);
  if (!array.length) return 0;
  if (array.length % 2 === 0) {
    return (
      (array[array.length / 2][field] + array[array.length / 2 - 1][field]) / 2
    );
  } else {
    return array[(array.length - 1) / 2][field]; // array with odd number elements
  }
};
