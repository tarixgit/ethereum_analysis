const pubsub = require("./pubsub");
const {
  filter,
  forEach,
  flatMap,
  map,
  differenceBy,
  uniqBy,
  concat
} = require("lodash");
const rp = require("request-promise");
const { fork } = require("child_process");
const path = require("path");

const {
  buildFeatureForAddresses,
  updateFeatureForAdresses,
  addLog
} = require("./utils");

const debugMode =
  typeof v8debug === "object" ||
  /--debug|--inspect/.test(process.execArgv.join(" "));
const MESSAGE = "message";

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
        const normalAddressFeatures = await buildFeatureForAddresses(
          db,
          importWhiteAddressesNotInDB,
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
      const addresses = await db.address_feature.findAll();
      // TODO make posible to set this parameter on frontend and also which type of Adresses you want to import/calc
      // addresses = filter(addresses, ({ id }) => id < 4173 && id > 4169);
      const scamAddresses = filter(addresses, "scam");
      const whiteAddresses = filter(addresses, item => !item.scam);

      const scamAddressFeatures = await updateFeatureForAdresses(
        db,
        scamAddresses
      );
      const normalAddressFeatures = await updateFeatureForAdresses(
        db,
        whiteAddresses
      );
      const addressFeatures = concat(
        scamAddressFeatures,
        normalAddressFeatures
      );
      if (addressFeatures.length) {
        forEach(addressFeatures, address => address.save());
      }
      return {
        success: !!addressFeatures,
        message: `Success`
      };
    },
    buildFeaturesThread: async (parent, data, { db }, info) => {
      startThreadCalc(false);
      return {
        success: true,
        message: "Calculation running"
      };
    },
    recalcFeaturesThread: async (parent, data, { db }, info) => {
      /**
       * needed if db with blockchain updatet
       * */
      startThreadCalc(true);
      return {
        success: true,
        message: "Calculation running"
      };
    }
  }
};
const startThreadCalc = async isRecalc => {
  const port = Math.floor(Math.random() * (65000 - 20000) + 20000);
  const forked = fork(
    path.join(__dirname, "buildFeaturesThread.js"),
    [],
    debugMode
      ? {
          execArgv: ["--inspect-brk=" + port]
        }
      : {}
  );
  forked.on("message", ({ msg = null }) => {
    addLog("buildFeaturesThread", msg); // no needed await
    pubsub.publish(MESSAGE, { messageNotify: { message: msg } });
  });
  forked.on("exit", async status => {
    await addLog(
      "buildFeaturesThread",
      `Feature calculation process in thread stopped with code: ${status}`
    );
    if (status) {
      pubsub.publish(MESSAGE, {
        messageNotify: {
          message: "Error by features calc"
        }
      });
    } else {
      pubsub.publish(MESSAGE, {
        messageNotify: {
          message: "Features calculations ends successful"
        }
      });
    }
  });
  await addLog("buildFeaturesThread", `child pid: ${forked.pid}`);
  forked.send({
    isRecalc
  });
};
