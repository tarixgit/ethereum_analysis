const { addLog } = require("./utils");

const { groupBy, differenceWith, intersectionWith, flatMap, map, uniqBy } = require("lodash");
const models = require("../models/index");

process.on("message", x => {
  const { childrensArr, maxDepth, checkedAddress, direction } = x;
  return findScammers(childrensArr, maxDepth, checkedAddress, direction);
});

async function findScammers(childrensArr, maxDepth, checkedAddress, direction) {
  try {
    await addLog(
      "searchNeighborScamThread",
      `Started thread for searching scam neighbors with maxDepth ${maxDepth}`,
      process.pid
    );
    await addLog("searchNeighborScamThread", `Recieved the number of path: ${childrensArr.length}`, process.pid);
    const foundPaths = await findScammer(childrensArr, models, maxDepth, checkedAddress, direction, 0);
    process.send({ foundPaths });
    console.log(foundPaths);
    process.exit(0);
  } catch (err) {
    process.send({ msg: err });
    process.send({
      msg: `Error from child ${err} \n` + err.stack ? err.stack : ""
    });
    if (String(err).indexOf("Maximal level of") > -1) {
      process.exit(0);
    }
    process.exit(1);
  }
}

const findScammer = async (parentArr, db, depth, checkedAddress, direction, count) => {
  console.log(depth);
  if (depth <= 0) {
    // eslint-disable-next-line no-throw-literal
    throw `Maximal level of looping arrive. Checked the ${checkedAddress.length} addresses`;
  }
  // default from
  const from = !direction ? "from" : "to";
  const to = !direction ? "to" : "from";
  const parentIds = map(parentArr, arr => arr[arr.length - 1]);
  const trans = await db.transaction.findAll({
    attributes: ["id", "from", "to"],
    where: direction
      ? {
          to: parentIds
        }
      : {
          from: parentIds
        },
    raw: true
  });

  // remove cricles
  const transFiltered = differenceWith(trans, checkedAddress, (valueNew, valueOld) => valueNew[to] === valueOld);

  // build paths
  const transGrouped = groupBy(transFiltered, from);
  const newChildrenArray = flatMap(parentArr, pathToParent => {
    const parent = pathToParent[pathToParent.length - 1]; // is the same as transGrouped.key, iterate transGrouped.from
    let oneParentMoreChildrens = transGrouped[parent];
    oneParentMoreChildrens = uniqBy(oneParentMoreChildrens, to); // not good, if need sum of amout
    return map(oneParentMoreChildrens, item => [...pathToParent, item[to]]);
  });
  const childrensIds = map(newChildrenArray, arr => arr[arr.length - 1]);
  checkedAddress = checkedAddress.concat(childrensIds);
  // const ids = uniq(trans.map(({ to }) => to));
  // const newAddress = difference(ids, checkedAddress); // todo you can output the addresses
  // checkedAddress = checkedAddress.concat(newAddress);

  const foundScamAddress = await db.address_feature.findAll({
    attributes: ["id", "addressId", "scam"],
    where: { addressId: childrensIds, scam: true }
  });
  process.send({ msg: `Checking of level number ${count} is done` });
  if (foundScamAddress.length) {
    const pathsToScam = intersectionWith(
      newChildrenArray,
      foundScamAddress,
      (valuePath, valueAdd) => valuePath[valuePath.length - 1] === valueAdd.addressId
    );
    process.send({
      msg: `Found the scam address in neighbors. Checked ${checkedAddress.length} addresses and ${transFiltered.length} transactions.`
    });
    return pathsToScam;
  } else {
    return findScammer(newChildrenArray, db, depth - 1, checkedAddress, count + 1);
  }
};

exports.findScammer = findScammer;
