const parseArgsAndExecute = require("../lib");
const { CONFIG_FILENAME } = require("../lib/constants");

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


describe("Add files to the ignore array in config file", () => {}