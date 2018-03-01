const parseArgsAndExecute = require("../lib");
const { CONFIG_FILENAME } = require("../lib/constants");
const { addCommmitMsgPrefix } = require('../lib/utils');
const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");

const mainRepoRelativePath = "./repos/init/main";
const folderRepoRelativePath = "./repos/init/folder";
const mainRepoPath = path.resolve(__dirname, mainRepoRelativePath);
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath);

const repoToClone = "https://github.com/arslanarshad31/trello-react.git";
const folderPaths = ["public", "src/reducers"]; // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join("|^"));
let mainRepo;
let folderRepo;
const branchName = "master";

beforeAll(async done => {
  jest.setTimeout(10000);
  await Git.Clone.clone(repoToClone, mainRepoPath);
  done();
});

beforeEach(async done => {
  const initCmd = `init ${folderRepoRelativePath} --repo ${mainRepoRelativePath} --folder ${
    folderPaths[0]
  } --folder ${folderPaths[1]} --branch ${branchName}`;
  await parseArgsAndExecute(__dirname, initCmd.split(" "));
  mainRepo = await Git.Repository.open(mainRepoPath);
  folderRepo = await Git.Repository.open(folderRepoPath);
  done();
});

afterEach(async done => {
  await fs.remove(folderRepoPath);
  done();
});

afterAll(async done => {
  await fs.remove(mainRepoPath);
  done();
});

describe("Folder repo is forked correcly", () => {
  test("all unignored files are copied - check by counting", async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path));
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== ".gitignore");
    // excluding the config file
    expect(copiedFiles.length - 1).toBe(filesToCopy.length);
  });
  test("all unignored files are copied - check by name and file size", async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path));
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== ".gitignore")
      .filter(x => x.path !== CONFIG_FILENAME);
    expect(
      copiedFiles.map(({ fileSize, path }) => ({ fileSize, path }))
    ).toEqual(filesToCopy.map(({ fileSize, path }) => ({ fileSize, path })));
  });
  test("proper commit is made in the forked folder", async () => {
    const expected = addCommmitMsgPrefix((await mainRepo.getMasterCommit()).sha());
    const output = (await folderRepo.getMasterCommit()).message();
    expect(output).toBe(expected);
    await fs.remove(folderRepoPath);
  });
  test("config file is created correctly", async () => {
    const expected = {
      mainRepoPath: path.relative(folderRepoPath, mainRepoPath),
      folders: folderPaths,
      branch: branchName,
      ignore: [CONFIG_FILENAME]
    };
    expect(
      await fs.readJson(path.resolve(folderRepoPath, CONFIG_FILENAME))
    ).toEqual(expected);
  });
});
