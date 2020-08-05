const {
  countBy,
  groupBy,
  filter,
  map,
  forEach,
  uniq,
  keyBy,
  minBy,
  maxBy,
  differenceBy,
  meanBy,
  concat,
  compact,
  sortBy,
  slice
} = require("lodash");
const { addLog } = require("./utils");
const models = require("../models/index");

process.on("message", x => {
  const { isRecalc } = x;
  return buildFeaturesMain(isRecalc);
});

const getCounters = (inputCounters, outputCounters, index) => inputCounters[index] || 0 + outputCounters[index] || 0;
const getCounterInput = (inputCounters, index) => inputCounters[index] || 0;

const median = (array, field = "") => {
  array = sortBy(array, field);
  if (!array.length) return 0;
  if (array.length % 2 === 0) {
    return (array[array.length / 2][field] + array[array.length / 2 - 1][field]) / 2;
  } else {
    return array[(array.length - 1) / 2][field]; // array with odd number elements
  }
};

async function buildFeaturesMain(isRecalc) {
  try {
    await addLog(
      "buildFeaturesThread",
      isRecalc ? "Started thread recalculation of features" : "Started thread for features build for new address"
    );
    const msg = isRecalc ? await recalcFeatures() : await buildFeatures();
    process.send({ msg });
    process.exit(0);
  } catch (err) {
    process.send({ msg: err });
    process.send({
      msg: `Error from child ${err} \n` + err.stack ? err.stack : ""
    });
    process.exit(1);
  }
}

const recalcFeatures = async () => {
  // make it int %
  const addresses = await models.address_feature.findAll();
  const scamAddresses = filter(addresses, "scam");
  const whiteAddresses = filter(addresses, item => !item.scam);

  const scamAddressFeatures = await updateFeatureForAdresses(scamAddresses, true);
  process.send({ msg: "Calculation for scam address are done " });
  const normalAddressFeatures = await updateFeatureForAdresses(whiteAddresses, true);
  process.send({ msg: "Calculation for white address are done " });
  const addressFeatures = concat(scamAddressFeatures, normalAddressFeatures);
  if (addressFeatures.length) {
    forEach(addressFeatures, address => address.save());
    process.send({ msg: "Address features updated " });
    return "updated";
  }
  return "nothing to update";
};

const buildFeatures = async () => {
  const bathSize = 10;
  let countOfAllFeaturesAdd = 0;
  const importAddresses = await models.import_address.findAll({
    attributes: ["id", "hash", "scam"],
    raw: true
  });
  const addressesAlreadyInDB = await models.address_feature.findAll({
    where: { hash: map(importAddresses, "hash") } // not perfect but must be fast
  });
  const importAddressesNotInDB = differenceBy(importAddresses, addressesAlreadyInDB, "hash");
  const importScamAddressesNotInDB = filter(importAddressesNotInDB, "scam");
  const importWhiteAddressesNotInDB = filter(importAddressesNotInDB, item => !item.scam);
  const allCount = importAddressesNotInDB.length;

  const scamAddresses = await getAddress(importScamAddressesNotInDB);
  const batchCount = scamAddresses.length / bathSize;
  for (let i = 0; i < batchCount; i++) {
    const currentScamPoolAddress = slice(scamAddresses, i * bathSize, (i + 1) * bathSize);
    const scamAddressFeatures = await updateFeatureForAdresses(currentScamPoolAddress, false, true);
    if (scamAddressFeatures.length) {
      await models.address_feature.bulkCreate(scamAddressFeatures);
      countOfAllFeaturesAdd = countOfAllFeaturesAdd + scamAddressFeatures.length;
    }
    process.send({ msg: `Calculation running, ${(i + 1) / (allCount / bathSize)}% are done` });
  }
  process.send({ msg: "Calculation for scam address are done " });

  const whiteAddresses = await getAddress(importWhiteAddressesNotInDB);
  const batchCountNotScam = whiteAddresses.length / bathSize;
  for (let i = 0; i < batchCountNotScam; i++) {
    const currentNotScamPoolAddress = slice(whiteAddresses, i * bathSize, (i + 1) * bathSize);
    const notScamAddressFeatures = await updateFeatureForAdresses(currentNotScamPoolAddress, false, false);
    if (notScamAddressFeatures.length) {
      await models.address_feature.bulkCreate(notScamAddressFeatures);
      countOfAllFeaturesAdd = countOfAllFeaturesAdd + notScamAddressFeatures.length;
    }
    process.send({ msg: `Calculation running, ${(i + 1 + batchCount) / (batchCount + batchCountNotScam)}% are done` });
  }
  process.send({ msg: "Calculation for white address are done " });
  return `Address features created: ${countOfAllFeaturesAdd}`;
};

const getAddress = importAddresses => {
  const hashes = map(importAddresses, "hash");
  return models.address.findAll({
    attributes: ["id", "hash"],
    where: { hash: hashes },
    raw: true
  });
};
const updateFeatureForAdresses = async (addresses, isRecalc, isScam) => {
  const ids = uniq(map(addresses, "addressId"));

  let transactionsInputs = await models.transaction.findAll({
    attributes: ["id", "bid", "tid", "from", "to", "amount"],
    where: {
      to: ids
    },
    raw: true
  });
  const inputNeighborIds = uniq(map(transactionsInputs, "from"));
  const inputNeighbors = await models.address.findAll({
    attributes: ["id", "labelId", "scam"],
    where: { id: inputNeighborIds },
    raw: true
  });
  const inputNeighborsKeyed = keyBy(inputNeighbors, "id");
  transactionsInputs = map(transactionsInputs, item => {
    item.fromAddress = inputNeighborsKeyed[item.from];
    return item;
  });

  let transactionsOutputs = await models.transaction.findAll({
    attributes: ["id", "bid", "tid", "from", "to", "amount"],
    where: {
      from: ids
    },
    raw: true
  });
  const outputNeighborIds = uniq(map(transactionsOutputs, "to"));
  const outputNeighbors = await models.address.findAll({
    attributes: ["id", "labelId", "scam"],
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

  return isRecalc
    ? updateFeatures(addresses, transactionsInputsKeyed, transactionsOutputsKeyed)
    : createFeatures(addresses, transactionsInputsKeyed, transactionsOutputsKeyed, isScam);
};

const updateFeatures = (addresses, transactionsInputsKeyed, transactionsOutputsKeyed) =>
  map(addresses, add => {
    const transactionsInput = transactionsInputsKeyed[add.addressId] || [];
    const transactionsOutput = transactionsOutputsKeyed[add.addressId] || [];
    return getFeatureSetUpdate(add, transactionsInput, transactionsOutput);
  });

const createFeatures = (addresses, transactionsInputsKeyed, transactionsOutputsKeyed, isScam) => {
  let fullAddresses = map(addresses, ({ id, hash }) => ({
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
  }));
  fullAddresses = filter(
    fullAddresses,
    add => transactionsInputsKeyed[add.addressId] || transactionsOutputsKeyed[add.addressId]
  );
  return map(fullAddresses, add => {
    const transactionsInput = transactionsInputsKeyed[add.addressId] || [];
    const transactionsOutput = transactionsOutputsKeyed[add.addressId] || [];
    return getFeatureSetUpdate(add, transactionsInput, transactionsOutput);
  });
};

const getFeatureSetUpdate = (address, transactionsInput, transactionsOutput) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length ? 0 : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length ? 0 : transactionsOutput.length;
  if (countOfAllTransaction) {
    address.numberOfNone = getCounters(inputCounters, outputCounters, 0);
    address.numberOfOneTime = getCounters(inputCounters, outputCounters, 3);
    address.numberOfExchange = getCounters(inputCounters, outputCounters, 6);
    address.numberOfMiningPool = getCounters(inputCounters, outputCounters, 1);
    address.numberOfMiner = getCounters(inputCounters, outputCounters, 5);
    address.numberOfSmContract = getCounters(inputCounters, outputCounters, 2);
    address.numberOfERC20 = getCounters(inputCounters, outputCounters, 7);
    address.numberOfERC721 = getCounters(inputCounters, outputCounters, 8);
    address.numberOfTrace = getCounters(inputCounters, outputCounters, 4);
    address.numberOfNoneInput = getCounterInput(inputCounters, 0);
    address.numberOfOneTimeInput = getCounterInput(inputCounters, 3);
    address.numberOfExchangeInput = getCounterInput(inputCounters, 6);
    address.numberOfMiningPoolInput = getCounterInput(inputCounters, 1);
    address.numberOfMinerInput = getCounterInput(inputCounters, 5);
    address.numberOfSmContractInput = getCounterInput(inputCounters, 2);
    address.numberOfERC20Input = getCounterInput(inputCounters, 7);
    address.numberOfERC721Input = getCounterInput(inputCounters, 8);
    address.numberOfTraceInput = getCounterInput(inputCounters, 4);
    address.medianOfEthProTrans = median(fullArr, "amount");
    address.averageOfEthProTrans = !countOfAllTransaction ? 0 : meanBy(fullArr, "amount");
    address.transInputMedian = median(transactionsInput, "amount");
    address.transOutputMedian = median(transactionsOutput, "amount");
    address.transInputAverage = !transactionsInput.length ? 0 : meanBy(transactionsInput, "amount");
    address.transOutputAverage = !transactionsOutput.length ? 0 : meanBy(transactionsOutput, "amount");
    address.numberOfTransInput = countOfTransInput;
    address.numberOfTransOutput = countOfTransOutput;
    address.numberOfTransactions = countOfAllTransaction;
    address.minEth = minBy(fullArr, "amount");
    address.maxEth = maxBy(fullArr, "amount");

    address.transInputMinEth = minBy(transactionsInput, "amount");
    address.transInputMaxEth = maxBy(transactionsInput, "amount");
    address.transOutputMinEth = minBy(transactionsOutput, "amount");
    address.transOutputMaxEth = maxBy(transactionsOutput, "amount");
    address.transInputMedianEth = median(transactionsInput, "amount");
    address.transInputAverageEth = meanBy(transactionsInput, "amount");
    address.transOutputMedianMinEth = median(transactionsOutput, "amount");
    address.transOutputAverageEth = meanBy(transactionsOutput, "amount");
    address.numberOfScamNeighbor =
      countBy(transactionsInput, "fromAddress.scam").true + countBy(transactionsOutput, "fromAddress.scam").true;
    address.numberOfScamNeighborInput = countBy(transactionsInput, "fromAddress.scam").true;
  }
  return address;
};

exports.getFeatureSetUpdate = getFeatureSetUpdate;
