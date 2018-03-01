const fs = require("fs-extra");
const path = require("path");
const Git = require('nodegit');
const { TEMPORARY_FOLDER_NAME } = require('./constants');
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

function addCommmitMsgPrefix(msg) {
  return COMMIT_MSG_PREFIX + msg;
}

function removeCommitMsgPrefix(msg) {
  return msg.replace(COMMIT_MSG_PREFIX, "");
}

function ensureArray(input) {
  if (!input) {
    return [];
  } else {
    return Array.isArray(input) ? input : [input];
  }
}

async function getLastGitSliceCommitHash(repo) {
  const revwalk = Git.Revwalk.create(repo);
  revwalk.pushHead();
  const commits = await revwalk.getCommitsUntil(c => true);
  return removeCommitMsgPrefix(commits.find(x => x.message().indexOf("git-slice:") === 0).message())
}

async function cloneMainRepo(folderRepoPath, mainUrl) {
  const mainRepoPath = path.resolve(folderRepoPath, TEMPORARY_FOLDER_NAME);
  await fs.remove(mainRepoPath);
  const output = await Git.Clone.clone(mainUrl, mainRepoPath);
  return mainRepoPath;
}

module.exports = {
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix,
  ensureArray,
  getLastGitSliceCommitHash,
  cloneMainRepo
};
