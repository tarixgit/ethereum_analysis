const { Op } = require("sequelize");
const { map } = require("lodash");
const rp = require("request-promise");
const HTMLParser = require("node-html-parser");
const tough = require("tough-cookie");

const options = {
  uri: "https://etherscan.io/tokens?q=+&p=",
  headers: {
    "User-Agent": "Request-Promise"
  }
};

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
    updateLabelFromEther: async (parent, data, { db }, info) => {
      try {
        // const cookie = new tough.Cookie({
        //   key: "__cfduid",
        //   value: "db73ab738f8238e407662f1ae91bfe24d1596121678",
        //   domain: ".etherscan.io",
        //   httpOnly: true,
        //   maxAge: 31536000
        // });
        // const cookie2 = new tough.Cookie({
        //   key: "ASP.NET_SessionId",
        //   value: "dus4upnckdheuzorlnrbiolu",
        //   domain: ".etherscan.io",
        //   httpOnly: true,
        //   maxAge: 31536000
        // });
        // const cookiejar = new tough.CookieJar();
        // cookiejar.setCookie(cookie, "https://etherscan.io");
        const newOptions = options;
        let i = 12;
        let importAddresses = [];
        do {
          importAddresses = [];

          newOptions.uri = `${options.uri}${i}`;
          newOptions.headers = {
            "content-type":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            // "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8,uk;q=0.7,de;q=0.6",
            "cache-control": "no-cache",
            cookie: "__cfduid=db73ab738f8238e407662f1ae91bfe24d1596121678; ASP.NET_SessionId=dus4upnckdheuzorlnrbiolu",
            pragma: "no-cache",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": 1,
            "user-agent":
              " Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36"
          };
          // newOptions.jar = cookiejar;
          const results = await rp(newOptions);

          if (results) {
            // prepare data
            const root = HTMLParser.parse(results);
            const table = root.querySelectorAll("tbody tr");
            importAddresses = map(table, row => {
              const hash = row.querySelector("a").text;
              const name = row.querySelectorAll("td")[1].text;
              const symbol = row.querySelectorAll("td")[2].text;
              return {
                hash,
                name,
                labelId: 7,
                symbol,
                category: "ERC20"
              };
            });

            if (importAddresses.length) {
              await db.import_address_label.bulkCreate(importAddresses);
            }
            await sleep(1000 + 1000 * Math.trunc(Math.random() * 10));
          }
          i = i + 1;
          console.log(i);
        } while (importAddresses.length);
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
