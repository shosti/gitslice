const Git = require("nodegit");
const fs = require("fs-extra");
const path = require("path");
const parseArgsAndExecute = require("../lib");
const _ = require('lodash');
const { CONFIG_FILENAME } = require("../lib/constants");

const mainRepoRelativePath = "./repos/utils/main";
const folderRepoRelativePath = "./repos/utils/folder";
const mainRepoPath = path.resolve(__dirname, mainRepoRelativePath);
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath);
const {  
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix,
  ensureArray,
  getLastGitSliceCommitHash
} = require("../lib/utils");

const repoToClone = "https://github.com/arslanarshad31/trello-react.git";
const folderPaths = ["public", "src/reducers"]; // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join("|^"));
let folderRepo;
let mainRepo;
const branchName = "master";
const COMMIT_MSG_PREFIX = "git-slice:";

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

describe("ensureArray", () => {
  it("should return an empty array if input is empty or null", () => {
    expect(ensureArray('')).toEqual([]);
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
  });

  it("should convert primitive to array", () => {
    expect(ensureArray(5)).toEqual([5])
  });

  it("should convert objects to array", () => {
    const expectResult = [{id: 1, author: 'test'}];
    expect(ensureArray({id: 1, author: 'test'})).toEqual(expectResult);
  });
});

describe("getCurBranch", () => {
  it("should return the master branch", async(done) => {
    expect(await getCurBranch(folderRepo)).toBe("master");
    done();
  });

  it("should return current branch name after successful checkout", async(done) => {
    const testBranch = "test-branch";
    await folderRepo.createBranch(
      testBranch,
      (await folderRepo.getMasterCommit()).sha(),
      true
    );
    await folderRepo.checkoutBranch(testBranch);
    await folderRepo.setHead(`refs/heads/${testBranch}`);
    expect(await getCurBranch(folderRepo)).toBe("test-branch");
    done();
  });
});

describe("addCommitMsgPrefix", () => {
  it("should add correct message prefix always", () => {
    const commitMessage = "Add test files";
    expect(addCommmitMsgPrefix(commitMessage)).toBe(`${COMMIT_MSG_PREFIX}${commitMessage}`);
  });
});

describe("removeCommitMsgPrefix", () => {
  it("should remove commit message prefix", () => {
    const commitMessage = `${COMMIT_MSG_PREFIX}Add test files`;
    expect(removeCommitMsgPrefix(commitMessage)).toBe("Add test files");
  });
});

describe("getAllFiles", () => {
  let allFiles;
  const test1Path = path.resolve(folderRepoPath, folderPaths[0], 'test1.txt');
  const test2Path = path.resolve(folderRepoPath, folderPaths[1], 'test2.txt');

  const test1Text = "Test 1!";
  const test2Text = "Test 2!";

  it("should return the current files in the directory", async(done) => {
    allFiles = await getAllFiles(folderRepoPath);
    expect(allFiles.length).toBe(26);
    done();
  });

  it("should retur all files in a directory", async(done) => {
    await fs.outputFile(test1Path, test1Text);
    await fs.outputFile(test2Path, test2Text);
    allFiles = await getAllFiles(folderRepoPath);
    expect(allFiles.length).toBe(28);
    expect(await fs.readFile(test1Path, 'utf8')).toBe('Test 1!')
    expect(await fs.readFile(test2Path, 'utf8')).toBe('Test 2!')    
    done();
  });
});

xdescribe("getLastGitSliceCommitHash", () => {
  
});