const fs = require("fs-extra");
const path = require("path");

async function getAllFiles(dir) {
  try {
    let results = [];
    const list = await fs.readdir(dir);
    if (!list.length) return results
    for (let file of list) {
      file = path.resolve(dir, file);
      const stat = await fs.stat(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(await getAllFiles(file));
      } else {
        results.push(file);
      }
    }
    return results;
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  getAllFiles
};
