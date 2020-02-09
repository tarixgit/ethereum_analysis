const { filter, flatMap, map } = require("lodash");
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
      const t = await db.sequelize.transaction();
      try {
        const results = await rp(options);

        if (results.success) {
          const addresses = filter(
            results.result,
            ({ addresses, coin }) => !!addresses && coin === "ETH"
          );
          const importAddresses = flatMap(addresses, item => {
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

          // TODO too slow 1.2 min
          // bulkCreate was ca. 2 sec.
          // findALL bulkcreate
          await Promise.all(
            map(importAddresses, item =>
              db.import_address.findOrCreate({
                where: { hash: item.hash },
                defaults: item,
                transaction: t
              })
            )
          );
          await t.commit();
        }
        return {
          success: !!results,
          message: "success"
        };
      } catch (err) {
        console.log(err);
        await t.rollback();
        return {
          success: !err,
          message: "error"
        };
      }
    }
  }
};
