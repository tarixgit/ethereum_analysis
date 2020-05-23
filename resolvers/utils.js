const { map, uniq, groupBy, keyBy, sortBy } = require("lodash");
const { getFeatureSet, getFeatureSetUpdate } = require("./buildFeaturesThread");
const models = require("../models/index");

const getCounters = (inputCounters, outputCounters, index) =>
  inputCounters[index] || 0 + outputCounters[index] || 0;

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

module.exports = {
  buildFeatureForAddresses: async (db, importAddresses, isScam) => {
    const hashes = map(importAddresses, "hash");
    const addresses = await db.address.findAll({
      attributes: ["id", "hash"],
      where: { hash: hashes },
      raw: true
    });
    const ids = uniq(map(addresses, "id"));
    let transactionsInputs = await db.transaction.findAll({
      attributes: ["id", "bid", "tid", "from", "to", "amount"],
      where: {
        to: ids
      },
      raw: true
    });
    const inputNeighborIds = uniq(map(transactionsInputs, "from"));
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
    const outputNeighborIds = uniq(map(transactionsOutputs, "to"));
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
      transactionsInput: transactionsInputsKeyed[id] || [],
      transactionsOutput: transactionsOutputsKeyed[id] || []
    }));

    const addressFeatures = map(fullAddresses, address =>
      getFeatureSet(address, isScam)
    );
    return addressFeatures;
  },
  updateFeatureForAdresses: async (db, addresses) => {
    const ids = uniq(map(addresses, "addressId"));
    // TODO make one transaction findAll?, not two, test with counts
    let transactionsInputs = await db.transaction.findAll({
      attributes: ["id", "bid", "tid", "from", "to", "amount"],
      where: {
        to: ids
      },
      raw: true
    });
    const inputNeighborIds = uniq(map(transactionsInputs, "from"));
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
    const outputNeighborIds = uniq(map(transactionsOutputs, "to"));
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
    const addressFeaturesUpdated = map(addresses, add => {
      const transactionsInput = transactionsInputsKeyed[add.addressId] || [];
      const transactionsOutput = transactionsOutputsKeyed[add.addressId] || [];
      return getFeatureSetUpdate(add, transactionsInput, transactionsOutput);
    });

    return addressFeaturesUpdated;
  },
  addLog: async (name, description) => {
    console.log(`${name}: ${description}`);
    return models.log.create({ name, description });
  },
  getCounters,
  median
};
