const { merge } = require("lodash");
const mainResolver = require("./mainResolver");
const addressResolver = require("./addressResolver");
const transactionResolver = require("./transactionResolver");

module.exports = merge(mainResolver, [addressResolver, transactionResolver]);
