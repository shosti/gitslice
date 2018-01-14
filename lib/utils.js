const fs = require("fs-extra");
const path = require("path");
const COMMIT_MSG_PREFIX = "git-slice:";

async function getAllFiles(dir) {
  try {
    let results = [];
    const list = await fs.readdir(dir);
    if (!list.length) return results;
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

async function getCurBranch(repo) {
  return (await repo.getCurrentBranch()).name().replace("refs/heads/", "");
}

function addCommmitMsgPrefix(msg){
  return COMMIT_MSG_PREFIX + msg;
}

function removeCommitMsgPrefix(msg){
  return msg.replace(COMMIT_MSG_PREFIX, '');
}


module.exports = {
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix
};
