const {
  countBy,
  groupBy,
  filter,
  map,
  forEach,
  uniq,
  keyBy,
  differenceBy,
  meanBy,
  concat,
  compact
} = require("lodash");
const { getCounters, median, addLog } = require("./utils");
const models = require("../models/index");

process.on("message", x => {
  const { isRecalc } = x;
  return buildFeaturesMain(isRecalc);
});

async function buildFeaturesMain(isRecalc) {
  try {
    await addLog(
      "buildFeaturesThread",
      isRecalc
        ? "Started thread recalculation of features"
        : "Started thread for features build for new address"
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
  const addresses = await models.address_feature.findAll();
  const scamAddresses = filter(addresses, "scam");
  const whiteAddresses = filter(addresses, item => !item.scam);

  const scamAddressFeatures = await updateFeatureForAdresses(
    scamAddresses,
    true
  );
  process.send({ msg: "Calculation for scam address are done " });
  const normalAddressFeatures = await updateFeatureForAdresses(
    whiteAddresses,
    true
  );
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
  const importAddresses = await models.import_address.findAll({
    attributes: ["id", "hash", "scam"],
    raw: true
  });
  const addressesAlreadyInDB = await models.address_feature.findAll({
    where: { hash: map(importAddresses, "hash") } // not perfect but must be fast
  });
  const importAddressesNotInDB = differenceBy(
    importAddresses,
    addressesAlreadyInDB,
    "hash"
  );
  const importScamAddressesNotInDB = filter(importAddressesNotInDB, "scam");
  const importWhiteAddressesNotInDB = filter(
    importAddressesNotInDB,
    item => !item.scam
  );
  const scamAddresses = await getAddress(importScamAddressesNotInDB);
  const scamAddressFeatures = await updateFeatureForAdresses(
    scamAddresses,
    false,
    true
  );
  process.send({ msg: "Calculation for scam address are done " });
  const whiteAddresses = await getAddress(importWhiteAddressesNotInDB);
  const normalAddressFeatures = await updateFeatureForAdresses(
    whiteAddresses,
    false,
    false
  );
  process.send({ msg: "Calculation for white address are done " });
  const addressFeatures = concat(scamAddressFeatures, normalAddressFeatures);
  if (addressFeatures.length) {
    await models.address_feature.bulkCreate(addressFeatures);
    return `Address features created: ${addressFeatures.length}`;
  }
  return "No features to created";
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
    attributes: ["id", "labelId"],
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

  return isRecalc
    ? updateFeatures(
        addresses,
        transactionsInputsKeyed,
        transactionsOutputsKeyed
      )
    : createFeatures(
        addresses,
        transactionsInputsKeyed,
        transactionsOutputsKeyed,
        isScam
      );
};

const updateFeatures = (
  addresses,
  transactionsInputsKeyed,
  transactionsOutputsKeyed
) =>
  map(addresses, add => {
    const transactionsInput = transactionsInputsKeyed[add.addressId] || [];
    const transactionsOutput = transactionsOutputsKeyed[add.addressId] || [];
    return getFeatureSetUpdate(add, transactionsInput, transactionsOutput);
  });

const createFeatures = (
  addresses,
  transactionsInputsKeyed,
  transactionsOutputsKeyed,
  isScam
) => {
  let fullAddresses = map(addresses, ({ id, hash }) => ({
    id,
    hash,
    transactionsInput: transactionsInputsKeyed[id] || [],
    transactionsOutput: transactionsOutputsKeyed[id] || []
  }));
  fullAddresses = filter(
    fullAddresses,
    addr => addr.transactionsInput.length || addr.transactionsOutput.length
  );
  return map(fullAddresses, address => getFeatureSet(address, isScam));
};

const getFeatureSetUpdate = (
  address,
  transactionsInput,
  transactionsOutput
) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length
    ? 0
    : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length
    ? 0
    : transactionsOutput.length;
  if (countOfAllTransaction) {
    address.numberOfNone = getCounters(
      inputCounters,
      outputCounters,
      0,
      countOfAllTransaction
    );
    address.numberOfOneTime = getCounters(
      inputCounters,
      outputCounters,
      3,
      countOfAllTransaction
    );
    address.numberOfExchange = getCounters(
      inputCounters,
      outputCounters,
      6,
      countOfAllTransaction
    );
    address.numberOfMiningPool = getCounters(
      inputCounters,
      outputCounters,
      1,
      countOfAllTransaction
    );
    address.numberOfMiner = getCounters(
      inputCounters,
      outputCounters,
      5,
      countOfAllTransaction
    );
    address.numberOfSmContract = getCounters(
      inputCounters,
      outputCounters,
      2,
      countOfAllTransaction
    );
    address.numberOfERC20 = getCounters(
      inputCounters,
      outputCounters,
      7,
      countOfAllTransaction
    );
    address.numberOfERC721 = getCounters(
      inputCounters,
      outputCounters,
      8,
      countOfAllTransaction
    );
    address.numberOfTrace = getCounters(
      inputCounters,
      outputCounters,
      4,
      countOfAllTransaction
    );
    address.medianOfEthProTrans = median(fullArr, "amount");
    address.averageOfEthProTrans = !countOfAllTransaction
      ? 0
      : meanBy(fullArr, "amount");
    address.numberOfTransInput = countOfTransInput;
    address.numberOfTransOutput = countOfTransOutput;
    address.numberOfTransactions = countOfAllTransaction;
  }
  return address;
};

const getFeatureSet = (
  { id, hash, transactionsInput, transactionsOutput },
  isScam
) => {
  const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length
    ? 0
    : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length
    ? 0
    : transactionsOutput.length;
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
    numberOfNone: getCounters(
      inputCounters,
      outputCounters,
      0,
      countOfAllTransaction
    ),
    numberOfOneTime: getCounters(
      inputCounters,
      outputCounters,
      3,
      countOfAllTransaction
    ),
    numberOfExchange: getCounters(
      inputCounters,
      outputCounters,
      6,
      countOfAllTransaction
    ),
    numberOfMiningPool: getCounters(
      inputCounters,
      outputCounters,
      1,
      countOfAllTransaction
    ),
    numberOfMiner: getCounters(
      inputCounters,
      outputCounters,
      5,
      countOfAllTransaction
    ),
    numberOfSmContract: getCounters(
      inputCounters,
      outputCounters,
      2,
      countOfAllTransaction
    ),
    numberOfERC20: getCounters(
      inputCounters,
      outputCounters,
      7,
      countOfAllTransaction
    ),
    numberOfERC721: getCounters(
      inputCounters,
      outputCounters,
      8,
      countOfAllTransaction
    ),
    numberOfTrace: getCounters(
      inputCounters,
      outputCounters,
      4,
      countOfAllTransaction
    ),
    // TODO try to make medianOfEthProTrans and averageOfEthProTrans for input and output
    medianOfEthProTrans: median(fullArr, "amount"),
    averageOfEthProTrans: !countOfAllTransaction
      ? 0
      : meanBy(fullArr, "amount"),
    numberOfTransInput: countOfTransInput,
    numberOfTransOutput: countOfTransOutput,
    numberOfTransactions: countOfAllTransaction
  };
};

exports.getFeatureSetUpdate = getFeatureSetUpdate;
exports.getFeatureSet = getFeatureSet;
