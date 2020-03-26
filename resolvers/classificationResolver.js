const {
  countBy,
  filter,
  forEach,
  flatMap,
  map,
  differenceBy,
  uniq,
  uniqBy,
  groupBy,
  keyBy,
  slice,
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
      try {
        const importAddresses = await db.import_address.findAll({
          attributes: ["id", "hash", "scam"],
          raw: true
        });
        const addressesAlreadyInDB = await db.address_feature.findAll({
          where: { hash: map(importAddresses, "hash") } // not perfect but must be fast
        });
        const importAddressesNotInDB = differenceBy(
          importAddresses,
          addressesAlreadyInDB,
          "hash"
        );
        const importScamAddressesNotInDB = filter(
          importAddressesNotInDB,
          "scam"
        );
        const importWhiteAddressesNotInDB = filter(
          importAddressesNotInDB,
          item => !item.scam
        );

        const scamAddressFeatures = await buildFeatureForAdresses(
          db,
          importScamAddressesNotInDB,
          true
        );
        // TODO some of Adresses have a ca 500 000 - 1 000 000 Transaction wo we can't import of all
        // TODO make posible to set this parameter on frontend and also which type of Adresses you want to import
        const tempArr = slice(importWhiteAddressesNotInDB, 140, 160);
        const normalAddressFeatures = await buildFeatureForAdresses(
          db,
          tempArr,
          false
        );
        const addressFeatures = concat(
          scamAddressFeatures,
          normalAddressFeatures
        );
        if (addressFeatures.length) {
          await db.address_feature.bulkCreate(addressFeatures);
        }
        return {
          success: !!addressFeatures,
          message: `Success`
        };
      } catch (e) {
        console.log(e);
      }
    },
    recalcFeatures: async (parent, data, { db }, info) => {
      let addresses = await db.address_feature.findAll();
      addresses = filter(addresses, ({ id }) => id < 5202 && id > 5186);
      const scamAddresses = filter(addresses, "scam");
      const whiteAddresses = filter(addresses, item => !item.scam);

      // TODO to speedup use addresses ids in this sub-func
      const scamAddressFeatures = await updateFeatureForAdresses(
        db,
        scamAddresses,
        true
      );
      const normalAddressFeatures = await updateFeatureForAdresses(
        db,
        whiteAddresses,
        false
      );
      const addressFeatures = concat(
        scamAddressFeatures,
        normalAddressFeatures
      );
      // TODO hack how to update, every must be single query
      if (addressFeatures.length) {
        forEach(addressFeatures, address => address.save());
      }
      return {
        success: !!addressFeatures,
        message: `Success`
      };
    }
  }
};

const buildFeatureForAdresses = async (db, importAddresses, isScam) => {
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
};

const updateFeatureForAdresses = async (db, addresses) => {
  const ids = uniq(map(addresses, "addressId"));
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
};

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
    medianOfEthProTrans: median(fullArr, "amount"),
    averageOfEthProTrans: !countOfAllTransaction
      ? 0
      : meanBy(fullArr, "amount"),
    numberOfTransInput: countOfTransInput,
    numberOfTransOutput: countOfTransOutput,
    numberOfTransactions: countOfAllTransaction
  };
};

// todo refactor
const getFeatureSetUpdate = (
  address,
  transactionsInput,
  transactionsOutput
) => {
  // const inputCounters = countBy(transactionsInput, "fromAddress.labelId");
  // const outputCounters = countBy(transactionsOutput, "toAddress.labelId");
  const fullArr = compact(concat(transactionsInput, transactionsOutput));
  const countOfAllTransaction = fullArr.length;
  const countOfTransInput = !transactionsInput.length
    ? 0
    : transactionsInput.length;
  const countOfTransOutput = !transactionsOutput.length
    ? 0
    : transactionsOutput.length;
  if (countOfAllTransaction) {
    /*
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
      */
    address.numberOfTransInput = countOfTransInput;
    address.numberOfTransOutput = countOfTransOutput;
    address.numberOfTransactions = countOfAllTransaction;
  }
  return address;
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
