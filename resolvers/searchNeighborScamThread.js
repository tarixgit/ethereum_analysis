const { addLog } = require("./utils");

const {
  groupBy,
  differenceWith,
  find,
  flatMap,
  map,
  uniqBy
} = require("lodash");
const models = require("../models/index");

process.on("message", x => {
  const { childrensArr, maxDepth, checkedAddress } = x;
  return findScammers(childrensArr, maxDepth, checkedAddress);
});

async function findScammers(childrensArr, maxDepth, checkedAddress) {
  try {
    await addLog(
      "searchNeighborScamThread",
      `Started thread for searching scam neighbors with maxDepth ${maxDepth}`
    );
    await addLog(
      "searchNeighborScamThread",
      `Recieved the number of path: ${childrensArr.length}`
    );
    const foundPath = await findScammer(
      childrensArr,
      models,
      maxDepth,
      checkedAddress
    );
    process.send({ foundPath });
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

const findScammer = async (parentArr, db, maxDepth, checkedAddress) => {
  console.log(maxDepth);
  if (maxDepth <= 0) {
    // eslint-disable-next-line no-throw-literal
    throw `Maximal level of looping arrive. Checked the ${checkedAddress.length} addresses`;
  }
  const parentIds = map(parentArr, arr => arr[arr.length - 1]);
  const trans = await db.transaction.findAll({
    attributes: ["id", "from", "to"],
    where: {
      from: parentIds
    },
    raw: true
  });

  // remove cricles
  const transFiltered = differenceWith(
    trans,
    checkedAddress,
    (valueNew, valueOld) => valueNew.to === valueOld
  );

  // build paths
  const transGrouped = groupBy(transFiltered, "from");
  const newChildrenArray = flatMap(parentArr, pathToParent => {
    const parent = pathToParent[pathToParent.length - 1]; // is the same as transGrouped.key, iterate transGrouped.from
    let oneParentMoreChildrens = transGrouped[parent];
    oneParentMoreChildrens = uniqBy(oneParentMoreChildrens, "to"); // not good, if need sum of amout
    return map(oneParentMoreChildrens, item => [...pathToParent, item.to]);
  });
  const childrensIds = map(newChildrenArray, arr => arr[arr.length - 1]);
  checkedAddress = checkedAddress.concat(childrensIds);
  // const ids = uniq(trans.map(({ to }) => to));
  // const newAddress = difference(ids, checkedAddress); // todo you can output the addresses
  // checkedAddress = checkedAddress.concat(newAddress);

  const addresses = await db.address_feature.findAll({
    attributes: ["id", "addressId", "scam"],
    where: { addressId: childrensIds }
  });
  const foundScamAddress = find(addresses, ({ scam }) => scam);
  process.send({ msg: `Checking of level number ${maxDepth} is done` });
  if (foundScamAddress) {
    const pathToScam = find(
      newChildrenArray,
      path => path[path.length - 1] === foundScamAddress.addressId
    );
    process.send({ msg: `Found the scam address in neighbors` });
    return pathToScam;
  } else {
    return findScammer(newChildrenArray, db, maxDepth - 1, checkedAddress);
  }
};

exports.findScammer = findScammer;
