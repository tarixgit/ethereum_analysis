const { Op } = require("sequelize");
const { map, groupBy, filter } = require("lodash");
const axios = require("axios");
const HTMLParser = require("node-html-parser");
const { pubsub } = require("./pubsub");

const MESSAGE = "message";
const NONE = 0;
const MINNING_POOL = 1;
const ONETIME = 3;
const MINER = 5;
const EXCHANGE = 6;
const ERC20 = 7;
const ERC721 = 8;

// const options = {
//   uri: "https://etherscan.io/tokens?q=+&p=",
//   headers: {
//     "User-Agent": "Request-Promise"
//   }
// };

module.exports = {
  Query: {
    importAddress: (parent, { id }, { db }, info) => db.import_address.findByPk(id),

    importAddresses: (parent, { orderBy, addresses = null, limit: lim, offset, ids = null }, { db }, info) => {
      const whereOr = [];
      let order = null;
      if (addresses) {
        whereOr.push({ hash: addresses });
      }
      if (ids) {
        whereOr.push({ id: ids });
      }
      if (orderBy && orderBy.length && orderBy[0]) {
        order = map(orderBy, order => [order.field, order.type]);
      }

      return db.import_address.findAndCountAll({
        where: whereOr.length ? { [Op.or]: [...whereOr] } : null,
        offset,
        limit: lim || 100,
        order
      });
    }
  },
  Mutation: {
    /**
     * */
    importLabelFromEther: async (parent, { type }, { db }, info) => {
      try {
        // let link = type === 7 ? "https://etherscan.io/tokens?q=a&ps=100&p=" : null;
        // link = type === 8 ? "https://etherscan.io/tokens-nft?q=+&ps=100&p=" : link;
        // link =
        //   type === 7
        //     ? "https://etherscan.io/accounts/label/exchange?subcatid=undefined&size=100&start=1&col=1&order=asc"
        //     : link;
        let char = type === 7 ? 1 : 37;
        let importAddresses = [];
        const brakeResult = [];
        do {
          const letter = (char + 10).toString(36);
          let i = 1;
          do {
            importAddresses = [];
            let link = "";
            if (type === 7) {
              link = `https://etherscan.io/tokens?q=${letter}&ps=100&p=${i}`;
            }
            if (type === 8) {
              link = `https://etherscan.io/tokens-nft?q=+&ps=100&p=${i}`;
            }
            if (type === 6) {
              // needed credentials
              link = `https://etherscan.io/accounts/label/exchange?subcatid=undefined&size=100&start=${(i - 1) * 100 +
                1}&col=1&order=asc`;
            }
            const results = await axios.get(link, {
              responseType: "document",
              headers: {
                "content-type":
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                cookie:
                  "__cfduid=d9576c8dab355bb823ca66298c7ecc1161596125839; ASP.NET_SessionId=f1lt233x25iifhonohdmwdgz"
              }
            });

            if (results.data) {
              // prepare data
              const root = HTMLParser.parse(results.data);
              const table = root.querySelectorAll("tbody tr");
              importAddresses = map(table, row => {
                const hash = row.querySelector("a").text;
                const name = row.querySelectorAll("td")[1].text;
                const symbol = row.querySelectorAll("td")[2].text;
                return {
                  hash,
                  name,
                  labelId: type,
                  symbol,
                  category: type === 7 ? "ERC20" : "ERC721"
                };
              });

              if (importAddresses.length) {
                // await db.import_address_label.bulkCreate(importAddresses);
                for (let j = 0; j < importAddresses.length; j++) {
                  await db.import_address_label.findOrCreate({
                    where: { hash: importAddresses[j].hash },
                    defaults: importAddresses[j]
                  });
                }
              }
              await sleep(1000 + 1000 * Math.trunc(Math.random() * 10));
            }
            i = i + 1;
          } while (importAddresses.length);

          brakeResult.push(i);
          console.log(brakeResult);
          char = char + 1;
        } while (char < 37);

        return {
          success: true,
          message: `Imported 0`
        };
      } catch (err) {
        console.log("Crawling failed");
        console.log(err);
        return {
          success: !err,
          message: "error"
        };
      }
    },
    updateLabelsOnAddress: async (parent, { from, to }, { db }, info) => {
      // to === 0 mean all
      try {
        await updateLabel(ERC20, db, from, to);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Updating ERC20 address done`
          }
        });

        await updateLabel(ERC721, db, from, to);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Updating ERC721 address done`
          }
        });

        await updateLabel(EXCHANGE, db, from, to);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Updating Exchange address done`
          }
        });
        await updateMiner(db, from, to);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Updating Miner address done`
          }
        });
        await updateOneTime(db, from, to);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Updating OneTime address done`
          }
        });
        return {
          success: true,
          message: `Updating running`
        };
      } catch (err) {
        console.log("Updating failed");
        console.log(err);
        pubsub.publish(MESSAGE, {
          messageNotify: {
            message: `Error by updating`
          }
        });
        return {
          success: !err,
          message: "Updating failed"
        };
      }
    }
  }
};

const insertFromTo = (whereClause, from, to) =>
  to === 0 ? [{ id: { [Op.gte]: from } }, ...whereClause] : [{ id: { [Op.between]: [from, to] } }, ...whereClause];

const updateLabel = async (label, db, from, to) => {
  // use imported address with label to set labels
  const allImportedLABEL = await db.import_address_label.findAll({ where: { labelId: label }, raw: true });
  const allImportedLABELIds = map(allImportedLABEL, "id");
  let whereClause = [{ id: allImportedLABELIds }, { labelId: NONE }];
  whereClause = insertFromTo(whereClause, from, to);
  await db.address.update(
    {
      labelId: label
    },
    { where: { [Op.and]: whereClause } }
  );
};

const updateMiner = async (db, fromAddId, toAddId) => {
  // use imported address with label miner, participant of minning pool to set labels

  const allMinningPool = await db.address.findAll({
    where: { labelId: MINNING_POOL }, // 1
    raw: true
  });
  const allMinningPoolIds = map(allMinningPool, "id");

  const trans = db.transaction.findAll({
    attributes: ["id", "from", "to"],
    include: [
      {
        model: db.address,
        attributes: ["id"],
        as: "toAddress",
        where: {
          labelId: NONE
        },
        separate: true,
        limit: 1
      }
    ],
    raw: true,
    where: {
      from: allMinningPoolIds,
      to: toAddId === 0 ? { [Op.gte]: fromAddId } : { [Op.between]: [fromAddId, toAddId] }
    },
    limit: 2 // TODO for test, remove
  });

  const miners = map(trans, "to");
  await db.address.update(
    {
      labelId: MINER
    },
    { where: { id: miners } }
  );
};

const updateOneTime = async (db, fromAddId, toAddId) => {
  // use imported address with label miner, participant of minning pool to set labels
  let where = [
    {
      labelId: NONE
    }
  ];
  where = insertFromTo(where, fromAddId, toAddId);
  const allNone = await db.address.findAll({
    where: { [Op.and]: where },
    raw: true
  });
  const allNoneIds = map(allNone, "id");

  // TODO make batch for, cu the addressIds, this call!!!
  let trans = db.transaction.findAll({
    attributes: ["id", "from", "to"],
    raw: true,
    where: {
      from: allNoneIds
      // to: toAddId === 0 ? { [Op.gte]: fromAddId } : { [Op.between]: [fromAddId, toAddId] } // not needed
    },
    limit: 2 // TODO for test, remove
  });

  const transGrouped = groupBy(trans, "from");
  const transGroupedOneOut = filter(transGrouped, trans => trans.length === 1); // only one outcome transaction
  const transGroupedOneOutIds = map(transGroupedOneOut, "from");
  trans = db.transaction.findAll({
    attributes: ["id", "from", "to"],
    raw: true,
    where: {
      to: transGroupedOneOutIds
    },
    limit: 2 // TODO for test, remove
  });

  const transOneOutGrouped = groupBy(trans, "to");
  const transGroupedOneOutIn = filter(transOneOutGrouped, trans => trans.length === 1); // only one outcome transaction
  const transGroupedOneOutInIds = map(transGroupedOneOutIn, "to");

  await db.address.update(
    {
      labelId: ONETIME
    },
    { where: { id: transGroupedOneOutInIds } }
  );
};

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
