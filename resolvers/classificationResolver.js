import { uniqBy } from "lodash";

const { filter, flatMap, map, differenceBy } = require("lodash");
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
          // preapare data
          const resultFiltered = filter(
            results.result,
            ({ addresses, coin }) => !!addresses && coin === "ETH"
          );
          let importAddresses = flatMap(resultFiltered, item => {
            const {
              addresses,
              name,
              url,
              coin,
              category,
              subcategory,
              reporter,
              status
            } = item;
            return map(addresses, address => ({
              hash: address,
              name,
              url,
              coin,
              category,
              subcategory,
              reporter,
              status
            }));
          });

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
        }
        return {
          success: !!results,
          message: "success"
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
