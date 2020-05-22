const {
  filter,
  forEach,
  flatMap,
  map,
  differenceBy,
  uniqBy,
  slice,
  concat
} = require("lodash");
const rp = require("request-promise");

const {
  buildFeatureForAddresses,
  updateFeatureForAdresses
} = require("./utils");

const options = {
  uri: "https://etherscamdb.info/api/scams/",
  headers: {
    "User-Agent": "Request-Promise"
  },
  json: true
};

module.exports = {
  Mutation: {
    /**
     * import black list data from API "https://etherscamdb.info/api/scams/" that no included in db
     * */
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
          success: !results,
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

        const scamAddressFeatures = await buildFeatureForAddresses(
          db,
          importScamAddressesNotInDB,
          true
        );
        // TODO some of Adresses have a ca 500 000 - 1 000 000 Transaction wo we can't import of all
        // TODO make posible to set this parameter on frontend and also which type of Adresses you want to import
        const tempArr = slice(importWhiteAddressesNotInDB, 140, 160);
        const normalAddressFeatures = await buildFeatureForAddresses(
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
      /**
       * needed if db with blockchain updatet
       * */
      let addresses = await db.address_feature.findAll();
      // TODO some of Adresses have a ca 500 000 - 1 000 000 Transaction wo we can't import of all
      // TODO make posible to set this parameter on frontend and also which type of Adresses you want to import
      // temporal solution because some of exchange addresses have more than 500 000 transaction
      addresses = filter(addresses, ({ id }) => id < 5202 && id > 5186);
      const scamAddresses = filter(addresses, "scam");
      const whiteAddresses = filter(addresses, item => !item.scam);

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
