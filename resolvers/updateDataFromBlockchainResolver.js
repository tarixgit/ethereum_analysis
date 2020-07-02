const { pubsub } = require("./pubsub");
const { keyBy, uniqBy, map, differenceBy, compact } = require("lodash");
const Web3 = require("web3");
const NONE_LABEL = 0;
const MINER_LABEL = 1;
const SMARTCONTRACT_LABEL = 2;
const ONETIME_LABEL = 3;
const TRACE = 4;
const POOL_MEMBER = 5;
const STOCK = 6;
const ERC20 = 7;
const ERC721 = 8;
// const debugMode =
//   typeof v8debug === "object" ||
//   /--debug|--inspect/.test(process.execArgv.join(" "));
// const MESSAGE = "message";

const options = "ws://192.168.0.140:8546";

const web3 = new Web3(Web3.givenProvider || options);

module.exports = {
  Mutation: {
    /**
     * */
    updateDataFromBlockchain: async (parent, data, { db }, info) => {
      try {
        let maxBlockNumberInDB = await db.block.max("id");
        maxBlockNumberInDB = maxBlockNumberInDB + 1;
        const actualBlockNumber = await web3.eth.getBlockNumber();
        while (maxBlockNumberInDB < actualBlockNumber) {
          const t = await db.sequelize.transaction();
          try {
            // let sumOfReward = 0;
            const block = await web3.eth.getBlock(maxBlockNumberInDB);
            const { miner, timestamp, number } = block;
            const minerAddress = await db.address.findOrCreate({
              where: { hash: miner.toLowerCase() },
              default: { hash: miner.toLowerCase(), labelId: MINER_LABEL },
              transaction: t
            });

            const transHash = block.transactions;
            const transInBlockPromise = map(transHash, hash =>
              web3.eth.getTransaction(hash)
            );
            const transInBlock = await Promise.all(transInBlockPromise);

            let addressToFind = [];
            let addressToCreate = [];
            for (let i = 0; i < transInBlock.length; i++) {
              const { to, input, from, hash } = transInBlock[i];
              addressToFind.push({
                hash: from.toLowerCase(),
                labelId: NONE_LABEL
              }); // to find
              // if realy need, now onlye for reward clac, can be put in if
              const trans = await web3.eth.getTransactionReceipt(hash);
              // sumOfReward = sumOfReward + trans.cumulativeGasUsed * gasPrice;
              if (parseInt(input, 16) > 0) {
                if (!trans.status) {
                  addressToFind.push({
                    hash: to.toLowerCase(),
                    labelId: NONE_LABEL
                  });
                  continue;
                }
                if (!to) {
                  // contract creation
                  const address = trans.contractAddress;
                  addressToCreate.push({
                    hash: address.toLowerCase(),
                    labelId: SMARTCONTRACT_LABEL
                  });
                } else {
                  // contract create contract
                  // data: "0x0000000000000000000000004bd0c456fba17113e2049cc807755ac371792ba1",
                  // web3.utils.hexToAscii(data) - data in internal transaction
                  let addresses = map(trans.logs, ({ data }) =>
                    web3.utils.isAddress(data) ? removeNullFromHex(data) : null
                  );
                  addresses = compact(addresses);
                  addressToCreate = addressToCreate.concat(
                    map(addresses, hash => ({
                      hash,
                      labelId: SMARTCONTRACT_LABEL
                    }))
                  );
                }
              }
              if (to) {
                addressToFind.push({
                  hash: to.toLowerCase(),
                  labelId: NONE_LABEL
                });
              }
            }
            addressToFind = uniqBy(addressToFind, "hash");
            let allAddressInDB = await db.address.findAll({
              where: {
                hash: map(addressToFind, "hash")
              }
            });
            // allAddressNotInDb must be always empty
            allAddressInDB = map(allAddressInDB, add => {
              add.hash = add.hash.toLowerCase();
              return add;
            });
            const allAddressNotInDb = differenceBy(
              addressToFind,
              allAddressInDB,
              "hash"
            );

            // create contract addresses with missed address
            const missedAddress = await db.address.bulkCreate(
              addressToCreate.concat(allAddressNotInDb),
              { transaction: t }
            );
            allAddressInDB = allAddressInDB.concat(missedAddress);

            const allAddressInDBKeyed = keyBy(allAddressInDB, "hash");
            let transactionToWrite = map(
              transInBlock,
              ({ from, to, value, transactionIndex }) =>
                to
                  ? {
                      bid: number,
                      tid: transactionIndex,
                      amount: web3.utils.fromWei(value),
                      from: allAddressInDBKeyed[from.toLowerCase()].id,
                      to: allAddressInDBKeyed[to.toLowerCase()].id
                    }
                  : null
            );
            transactionToWrite = compact(transactionToWrite);
            // write in db
            // make transaction? for this
            await db.block.create(
              {
                id: number,
                miner: minerAddress[0].id,
                timestamp: timestamp,
                rate: 0,
                reward: number >= 4370000 && number < 7280000 ? 3 : 2
              },
              { transaction: t }
            );
            await db.transaction.bulkCreate(transactionToWrite, {
              transaction: t
            });
            maxBlockNumberInDB += 1;
          } catch (error) {
            // If the execution reaches this line, an error was thrown.
            // We rollback the transaction.
            await t.rollback();
          }
        }
        return {
          success: true,
          message: `HZ.`
        };
      } catch (err) {
        console.log(err);
        return {
          success: !err,
          message: "error"
        };
      }
    }
  }
};

// label(miner, .....)
// hash
// allias
// const insertNewAddressInDb = async (allAddressNotInDB, db) => {
//   //get label
//   // get allias from etherescan
//
//   let address = map(allAddressNotInDB, add => {})
//   const results = await rp({
//     uri: `https://etherscamdb.info/api/scams/${add}`,
//     headers: {
//       "User-Agent": "Request-Promise"
//     },
//     //json: true
//   });
//
//   if (results.success) {}
//   const newAddress = await Promise.all(map(allAddressNotInDB, add => db.address.create({
//      hash: add,
//      label:,
//      allias
//   })))
//   return newAddress
// };

function removeNullFromHex(x) {
  const parsed = parseInt(x, 16);
  if (isNaN(parsed)) {
    return 0;
  }
  return `0x${parsed.toString(16)}`;
}
