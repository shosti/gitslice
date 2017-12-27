const parseArgsAndExecute = require("../lib");
const { CONFIG_FILENAME } = require("../lib/constants");
const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getCurBranch } = require("../lib/utils");

const mainRepoRelativePath = "./repos/pull/main";
const folderRepoRelativePath = "./repos/pull/folder";
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

describe("Folder repo is synced properly with main repo", () => {
  test("added files in the main repo are properly synced to the folder repo", async () => {
    const testFile1Path = path.resolve(
      mainRepoPath,
      folderPaths[0],
      "testFile1.txt"
    );
    const testFile2Path = path.resolve(
      mainRepoPath,
      folderPaths[1],
      "testFile2.txt"
    );
    const testFile3Path = path.resolve(
      mainRepoPath,
      folderPaths[1],
      "testFile3.txt"
    );
    const testFile1Text = "Hello World!";
    const testFile2Text = "How are you?";
    const testFile3Text = "I am good";
    await fs.outputFile(testFile1Path, testFile1Text);
    await fs.outputFile(testFile2Path, testFile2Text);
    await fs.outputFile(testFile3Path, testFile3Text);
    const signature = mainRepo.defaultSignature();
    let index = await mainRepo.refreshIndex();
    await index.addByPath(path.relative(mainRepoPath, testFile1Path));
    await index.addByPath(path.relative(mainRepoPath, testFile2Path));
    await index.addByPath(path.relative(mainRepoPath, testFile3Path));
    await index.write();
    const oid = await index.writeTree();
    const parent = await mainRepo.getCommit(
      await Git.Reference.nameToId(mainRepo, "HEAD")
    );
    const addedFiles = await mainRepo.createCommit(
      "HEAD",
      signature,
      signature,
      "Added some files",
      oid,
      [parent]
    );
    await parseArgsAndExecute(folderRepoPath, ["pull"]);

    expect(
      await fs.readFile(
        testFile1Path.replace(mainRepoPath, folderRepoPath),
        "utf8"
      )
    ).toBe(testFile1Text);
    expect(
      await fs.readFile(
        testFile2Path.replace(mainRepoPath, folderRepoPath),
        "utf8"
      )
    ).toBe(testFile2Text);
    expect(
      await fs.readFile(
        testFile3Path.replace(mainRepoPath, folderRepoPath),
        "utf8"
      )
    ).toBe(testFile3Text);

    const expectedCommitMessage = (await mainRepo.getMasterCommit()).sha();
    const outputCommitMessage = (await folderRepo.getMasterCommit()).message();
    expect(outputCommitMessage).toBe(expectedCommitMessage);
  });

  test("deleted files in the main repo are properly synced to the folder repo", async () => {
    const testFile1 = (await fs.readdir(
      path.resolve(mainRepoPath, folderPaths[0])
    ))[0];
    const testFile1Path = path.resolve(mainRepoPath, folderPaths[0], testFile1);
    const testFile2 = (await fs.readdir(
      path.resolve(mainRepoPath, folderPaths[1])
    ))[0];
    const testFile2Path = path.resolve(mainRepoPath, folderPaths[1], testFile2);
    await fs.remove(testFile1Path);
    await fs.remove(testFile2Path);

    const signature = mainRepo.defaultSignature();
    let index = await mainRepo.refreshIndex();
    await index.remove(path.relative(mainRepoPath, testFile1Path), 0);
    await index.remove(path.relative(mainRepoPath, testFile2Path), 0);
    await index.write();
    const oid = await index.writeTree();
    const parent = await mainRepo.getCommit(
      await Git.Reference.nameToId(mainRepo, "HEAD")
    );
    const addedFiles = await mainRepo.createCommit(
      "HEAD",
      signature,
      signature,
      "Deleted some files",
      oid,
      [parent]
    );
    await parseArgsAndExecute(folderRepoPath, ["pull"]);

    expect(
      await fs.exists(testFile1Path.replace(mainRepoPath, folderRepoPath))
    ).toBe(false);
    expect(
      await fs.exists(testFile2Path.replace(mainRepoPath, folderRepoPath))
    ).toBe(false);

    const expectedCommitMessage = (await mainRepo.getMasterCommit()).sha();
    const outputCommitMessage = (await folderRepo.getMasterCommit()).message();
    expect(outputCommitMessage).toBe(expectedCommitMessage);
  });

  test("checkouts to the master branch before pulling", async () => {
    let branchName = "pull-test-branch";
    await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    );
    await folderRepo.checkoutBranch(branchName);
    await folderRepo.setHead(`refs/heads/${branchName}`);
    await parseArgsAndExecute(folderRepoPath, ["pull"]);
    expect(await getCurBranch(folderRepo)).toBe("master");
  });

  test("does not pull if there are uncommitted changes", async () => {
    expect.assertions(1);
    const testFile1Path = path.resolve(
      mainRepoPath,
      folderPaths[0],
      "testFile1.txt"
    );
    const testFile2Path = path.resolve(
      mainRepoPath,
      folderPaths[1],
      "testFile2.txt"
    );
    const testFile3Path = path.resolve(
      mainRepoPath,
      folderPaths[1],
      "testFile3.txt"
    );
    const testFile1Text = "Hello World!";
    const testFile2Text = "How are you?";
    const testFile3Text = "I am good";
    await fs.outputFile(testFile1Path, testFile1Text);
    await fs.outputFile(testFile2Path, testFile2Text);
    await fs.outputFile(testFile3Path, testFile3Text);
    try {
      await parseArgsAndExecute(folderRepoPath, ["pull"]);
    } catch (e) {
      expect(e).toBe("Error: cannot pull with uncommitted changes");
    }
  });

});
