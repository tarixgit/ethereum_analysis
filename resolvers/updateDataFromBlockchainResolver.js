// const { pubsub } = require("./pubsub");
const {
  keyBy,
  uniqBy,
  map,
  differenceBy,
  compact,
  forEach
} = require("lodash");
const dotenv = require("dotenv");
const result = dotenv.config();

if (result.error) {
  throw result.error;
}
const Web3 = require("web3");
const NONE_LABEL = 0;
const MINER_LABEL = 1;
const SMARTCONTRACT_LABEL = 2;
// const ONETIME_LABEL = 3;
// const TRACE = 4;
// const POOL_MEMBER = 5;
// const STOCK = 6;
// const ERC20 = 7;
// const ERC721 = 8;
// const debugMode =
//   typeof v8debug === "object" ||
//   /--debug|--inspect/.test(process.execArgv.join(" "));
// const MESSAGE = "message";

module.exports = {
  Mutation: {
    /**
     * */
    updateDataFromBlockchain: async (parent, data, { db }, info) => {
      try {
        const web3 = new Web3(Web3.givenProvider || process.env.WEB3CONNECT);
        let maxBlockNumberInDB = await db.block.max("id");
        maxBlockNumberInDB = maxBlockNumberInDB + 1;
        const actualBlockNumber = await web3.eth.getBlockNumber();
        while (maxBlockNumberInDB < actualBlockNumber) {
          const t = await db.sequelize.transaction();
          try {
            // let sumOfReward = 0;
            const block = await web3.eth.getBlock(maxBlockNumberInDB);
            const { miner, timestamp, number, transactions: transHash } = block;
            const minerAddress = await db.address.findOrCreate({
              where: { hash: miner.toLowerCase() },
              default: { hash: miner.toLowerCase(), labelId: MINER_LABEL },
              transaction: t
            });
            let transInBlock = null;
            const batch = new web3.eth.BatchRequest();
            if (transHash.length > 0) {
              forEach(transHash, hash => {
                batch.add(web3.eth.getTransaction.request(hash));
              });
              transInBlock = await batch.execute();
            }
            transInBlock = transInBlock ? transInBlock.response : [];
            let addressToFind = [];
            // let addressToCreate = [];
            for (let i = 0; i < transInBlock.length; i++) {
              const { to, input, from, hash } = transInBlock[i];
              addressToFind.push({
                hash: from.toLowerCase(),
                labelId: NONE_LABEL
              }); // to find
              // if realy need, now onlye for reward clac, can be put in if
              // sumOfReward = sumOfReward + trans.cumulativeGasUsed * gasPrice;
              if (parseInt(input, 16) > 0) {
                // todo maybe check only the :to: === null
                const trans = await web3.eth.getTransactionReceipt(hash);
                if (!trans.status && to) {
                  addressToFind.push({
                    hash: to.toLowerCase(),
                    labelId: NONE_LABEL
                  });
                  continue;
                }
                if (!to) {
                  // contract creation
                  const address = trans.contractAddress;
                  // because some Token address was imported already in different way
                  // addressToCreate.push({
                  //   hash: address.toLowerCase(),
                  //   labelId: SMARTCONTRACT_LABEL
                  // });
                  addressToFind.push({
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
                  addressToFind = addressToFind.concat(
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
              allAddressNotInDb,
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
            await t.commit();
            maxBlockNumberInDB += 1;
          } catch (error) {
            // If the execution reaches this line, an error was thrown.
            // We rollback the transaction.
            await t.rollback();
            console.log(error);
            break;
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
