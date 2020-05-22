const {
  groupBy,
  differenceWith,
  find,
  flatMap,
  map,
  uniqBy
} = require("lodash");
const models = require("../models/index");
// const models = require("./models");

process.on("message", x => {
  const { childrensArr, maxDepth, checkedAddress } = x;
  console.log("Recieved the number of adresses: ", childrensArr.length);
  return findScammers(childrensArr, maxDepth, checkedAddress);
});

async function findScammers(childrensArr, maxDepth, checkedAddress) {
  try {
    console.log("one");
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
    process.exit(1);
  }
}

const findScammer = async (parentArr, db, maxDepth, checkedAddress) => {
  // first try to go only out
  // create clever variable(object) to store the path
  if (maxDepth <= 0) {
    process.send({
      msg: `Maximal level of looping arrive. Checked the ${checkedAddress.leading} addresses`
    });
    return Promise.resolve("error: max depth arrive");
  }
  console.log(maxDepth);

  const parentIds = map(parentArr, arr => arr[arr.length - 1]);
  const trans = await db.transaction.findAll({
    attributes: ["id", "from", "to"],
    where: {
      from: parentIds
    },
    raw: true
  });

  // performance?
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
  // process.send({ msg: `Checking of level number ${maxDepth} is done` });
  if (foundScamAddress) {
    console.log(foundScamAddress);
    const pathToScam = find(
      newChildrenArray,
      path => path[path.length - 1] === foundScamAddress.addressId
    );
    process.send({ msg: `Found the scam address in neighbors` });
    console.log(pathToScam);
    return pathToScam;
  } else {
    return findScammer(newChildrenArray, db, maxDepth - 1, checkedAddress);
  }
};

exports.findScammer = findScammer;