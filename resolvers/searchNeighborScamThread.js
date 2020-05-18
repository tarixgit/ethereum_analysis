const { findScammer } = require("./utils/utils");
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
