const { Op } = require("sequelize");
const { map } = require("lodash");
const axios = require("axios");
const HTMLParser = require("node-html-parser");

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
    updateLabelFromEther: async (parent, { type }, { db }, info) => {
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
    }
  }
};

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
