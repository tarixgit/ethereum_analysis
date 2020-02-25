const { merge } = require("lodash");
const mainResolver = require("./mainResolver");
const addressResolver = require("./addressResolver");
const transactionResolver = require("./transactionResolver");
const classificationResolver = require("./classificationResolver");
const importAddressResolver = require("./importAddressResolver");
const addressFeatures = require("./addressFeatures");

module.exports = merge(
  mainResolver,
  addressResolver,
  transactionResolver,
  classificationResolver,
  importAddressResolver,
  addressFeatures
);
