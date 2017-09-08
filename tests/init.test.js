const initializeFolder = require("../lib/init.js");
const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");

const CONFIG_FILENAME = "git-fork.json";

const mainRepoPath = path.resolve(__dirname, "./repos/main");
const folderRepoPath = path.resolve(__dirname, "./repos/folder");
const folderPaths = ["src/actions", "src/utils", "src/reducers"]; // to be modified with the repo

test("all unignored files are copied - check by counting", async () => {
  try {
    await initializeFolder(mainRepoPath, folderPaths, folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.open(folderRepoPath);
    const folderPathRegExp = new RegExp(folderPaths.join("|^"))
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path));
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== ".gitignore");
    expect(copiedFiles.length).toBe(filesToCopy.length);
    await fs.remove(folderRepoPath);
  } catch (e) {
    console.log(e);
    await fs.remove(folderRepoPath);
  }
});

test("all unignored files are copied - check by name and file size", async () => {
  try {
    await initializeFolder(mainRepoPath, folderPaths, folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.open(folderRepoPath);
    const folderPathRegExp = new RegExp(folderPaths.join("|^"))
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path));
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== ".gitignore");
    expect(
      copiedFiles.map(({ fileSize, path }) => ({ fileSize, path }))
    ).toEqual(filesToCopy.map(({ fileSize, path }) => ({ fileSize, path })));
    await fs.remove(folderRepoPath);
  } catch (e) {
    console.log(e);
    await fs.remove(folderRepoPath);
  }
});

test("proper commit is made in the forked folder", async () => {
  try {
    await initializeFolder(mainRepoPath, folderPaths, folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.open(folderRepoPath);
    const expected = (await mainRepo.getMasterCommit()).sha();
    const output = (await folderRepo.getMasterCommit()).message();
    expect(output).toBe(expected);
    await fs.remove(folderRepoPath);
  } catch (e) {
    console.log(e);
    await fs.remove(folderRepoPath);
  }
});
