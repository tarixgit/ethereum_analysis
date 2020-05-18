const {
  groupBy,
  differenceWith,
  find,
  flatMap,
  map,
  uniqBy
} = require("lodash");

const findScammer = async (parentArr, db, maxDepth, checkedAddress) => {
  // first try to go only out
  // create clever variable(object) to store the path
  if (maxDepth <= 0) {
    return Promise.resolve("error: max depth arrive");
  }
  console.log(maxDepth);

  console.log("startiiiiing");
  // the next batch call because of weak Database server
  // const batchSize = 4;
  // const batchCount = Math.ceil(inputIds.length / batchSize);
  // let result = [];
  // for (let i = 0; i < batchCount; i++) {
  //   const batch = await db.transaction.findAll({
  //     attributes: ["id", "from", "to"],
  //     where: {
  //       from: inputIds.slice(i * batchSize, (i + 1) * batchSize)
  //     },
  //     raw: true
  //   });
  //   // todo add diff here
  //   result = result.concat(batch);
  // }
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
  if (foundScamAddress) {
    console.log(foundScamAddress);
    const pathToScam = find(
      newChildrenArray,
      path => path[path.length - 1] === foundScamAddress.addressId
    );
    console.log(pathToScam);
    return pathToScam;
  } else {
    return findScammer(newChildrenArray, db, maxDepth - 1, checkedAddress);
  }
};

exports.findScammer = findScammer;
