const { merge } = require("lodash");
const mainResolver = require("./mainResolver");
const addressResolver = require("./addressResolver");
const transactionResolver = require("./transactionResolver");
const classificationResolver = require("./classificationResolver");
const importAddressResolver = require("./importAddressResolver");
const addressFeatures = require("./addressFeatures");
const transactionFeatures = require("./transactionFeatures");
const logsResolver = require("./logsResolver");
const updateDataFromBlockchainResolver = require("./updateDataFromBlockchainResolver");

module.exports = merge(
  mainResolver,
  addressResolver,
  transactionResolver,
  classificationResolver,
  importAddressResolver,
  addressFeatures,
  transactionFeatures,
  logsResolver,
  updateDataFromBlockchainResolver
);
