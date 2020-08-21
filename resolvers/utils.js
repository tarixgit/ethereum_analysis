const { filter, map, uniq, groupBy, keyBy, countBy, meanBy, concat, compact, sortBy } = require("lodash");
const models = require("../models/index");

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
    let fullAddresses = map(addresses, ({ id, hash }) => ({
      id,
      hash,
      transactionsInput: transactionsInputsKeyed[id] || [],
      transactionsOutput: transactionsOutputsKeyed[id] || []
    }));
    fullAddresses = filter(fullAddresses, addr => addr.transactionsInput.length || addr.transactionsOutput.length);
    const addressFeatures = map(fullAddresses, address => getFeatureSet(address, isScam));
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
  addLog: async (name, description, threadId = null, data) => {
    console.log(`${name}: ${description}`);
    return models.log.create({ name, description, data, threadId });
  }
};

const getFeatureSetUpdate = (address, transactionsInput, transactionsOutput) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length ? 0 : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length ? 0 : transactionsOutput.length;
  if (countOfAllTransaction) {
    address.numberOfNone = getCounters(inputCounters, outputCounters, 0, countOfAllTransaction);
    address.numberOfOneTime = getCounters(inputCounters, outputCounters, 3, countOfAllTransaction);
    address.numberOfExchange = getCounters(inputCounters, outputCounters, 6, countOfAllTransaction);
    address.numberOfMiningPool = getCounters(inputCounters, outputCounters, 1, countOfAllTransaction);
    address.numberOfMiner = getCounters(inputCounters, outputCounters, 5, countOfAllTransaction);
    address.numberOfSmContract = getCounters(inputCounters, outputCounters, 2, countOfAllTransaction);
    address.numberOfERC20 = getCounters(inputCounters, outputCounters, 7, countOfAllTransaction);
    address.numberOfERC721 = getCounters(inputCounters, outputCounters, 8, countOfAllTransaction);
    address.numberOfTrace = getCounters(inputCounters, outputCounters, 4, countOfAllTransaction);
    address.medianOfEthProTrans = median(fullArr, "amount");
    address.averageOfEthProTrans = !countOfAllTransaction ? 0 : meanBy(fullArr, "amount");
    address.numberOfTransInput = countOfTransInput;
    address.numberOfTransOutput = countOfTransOutput;
    address.numberOfTransactions = countOfAllTransaction;
  }
  return address;
};

const getFeatureSet = ({ id, hash, transactionsInput, transactionsOutput }, isScam) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length ? 0 : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length ? 0 : transactionsOutput.length;
  if (!countOfAllTransaction) {
    return {
      hash,
      addressId: id,
      scam: isScam,
      numberOfNone: 0,
      numberOfOneTime: 0,
      numberOfExchange: 0,
      numberOfMiningPool: 0,
      numberOfMiner: 0,
      numberOfSmContract: 0,
      numberOfERC20: 0,
      numberOfERC721: 0,
      numberOfTrace: 0,
      medianOfEthProTrans: 0,
      averageOfEthProTrans: 0,
      numberOfTransInput: 0,
      numberOfTransOutput: 0,
      numberOfTransactions: 0
    };
  }
  return {
    hash,
    addressId: id,
    scam: isScam,
    numberOfNone: getCounters(inputCounters, outputCounters, 0, countOfAllTransaction),
    numberOfOneTime: getCounters(inputCounters, outputCounters, 3, countOfAllTransaction),
    numberOfExchange: getCounters(inputCounters, outputCounters, 6, countOfAllTransaction),
    numberOfMiningPool: getCounters(inputCounters, outputCounters, 1, countOfAllTransaction),
    numberOfMiner: getCounters(inputCounters, outputCounters, 5, countOfAllTransaction),
    numberOfSmContract: getCounters(inputCounters, outputCounters, 2, countOfAllTransaction),
    numberOfERC20: getCounters(inputCounters, outputCounters, 7, countOfAllTransaction),
    numberOfERC721: getCounters(inputCounters, outputCounters, 8, countOfAllTransaction),
    numberOfTrace: getCounters(inputCounters, outputCounters, 4, countOfAllTransaction),
    // TODO try to make medianOfEthProTrans and averageOfEthProTrans for input and output
    medianOfEthProTrans: median(fullArr, "amount"),
    averageOfEthProTrans: !countOfAllTransaction ? 0 : meanBy(fullArr, "amount"),
    numberOfTransInput: countOfTransInput,
    numberOfTransOutput: countOfTransOutput,
    numberOfTransactions: countOfAllTransaction
  };
};

const getCounters = (inputCounters, outputCounters, index) => inputCounters[index] || 0 + outputCounters[index] || 0;

const median = (array, field = "") => {
  array = sortBy(array, field);
  if (!array.length) return 0;
  if (array.length % 2 === 0) {
    return (array[array.length / 2][field] + array[array.length / 2 - 1][field]) / 2;
  } else {
    return array[(array.length - 1) / 2][field]; // array with odd number elements
  }
};
