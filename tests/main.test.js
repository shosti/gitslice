const initializeFolder = require("../lib/init.js");
const updateFolderFromMain = require("../lib/pull.js");
const updateMainFromFolder = require("../lib/push.js");
const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");

const CONFIG_FILENAME = "git-slice.json";

const mainRepoPath = path.resolve(__dirname, "./repos/main");
const folderRepoPath = path.resolve(__dirname, "./repos/folder");

const repoToClone = "https://github.com/arslanarshad31/trello-react.git";
const folderPaths = ["public", "src/reducers"]; // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join("|^"));
let mainRepo;
let folderRepo;

beforeAll(async done => {
  await Git.Clone.clone(repoToClone, mainRepoPath);
  done();
});

beforeEach(async done => {
  await initializeFolder(mainRepoPath, folderPaths, folderRepoPath);
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
    expect(copiedFiles.length).toBe(filesToCopy.length);
  });
  test("all unignored files are copied - check by name and file size", async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path));
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== ".gitignore");
    expect(
      copiedFiles.map(({ fileSize, path }) => ({ fileSize, path }))
    ).toEqual(filesToCopy.map(({ fileSize, path }) => ({ fileSize, path })));
  });
  test("proper commit is made in the forked folder", async () => {
    const expected = (await mainRepo.getMasterCommit()).sha();
    const output = (await folderRepo.getMasterCommit()).message();
    expect(output).toBe(expected);
    await fs.remove(folderRepoPath);
  });
  test("config file is created correctly", async () => {
    const expected = {
      mainRepoPath: path.relative(folderRepoPath, mainRepoPath),
      folders: folderPaths
    };
    expect(
      await fs.readJson(path.resolve(folderRepoPath, CONFIG_FILENAME))
    ).toEqual(expected);
  });
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
    await updateFolderFromMain(folderRepoPath);

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
    const testFile1 = (await fs.readdir(path.resolve(mainRepoPath, folderPaths[0])))[0]
    const testFile1Path = path.resolve(mainRepoPath, folderPaths[0], testFile1)
    const testFile2 = (await fs.readdir(path.resolve(mainRepoPath, folderPaths[1])))[0]
    const testFile2Path = path.resolve(mainRepoPath, folderPaths[1], testFile2)
    await fs.remove(testFile1Path)
    await fs.remove(testFile2Path)

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
    await updateFolderFromMain(folderRepoPath);

    expect(
      await fs.exists(
        testFile1Path.replace(mainRepoPath, folderRepoPath)
      )
    ).toBe(false);
    expect(
      await fs.exists(
        testFile2Path.replace(mainRepoPath, folderRepoPath)
      )
    ).toBe(false);

    const expectedCommitMessage = (await mainRepo.getMasterCommit()).sha();
    const outputCommitMessage = (await folderRepo.getMasterCommit()).message();
    expect(outputCommitMessage).toBe(expectedCommitMessage);

  });
});

describe("Main repo is synced properly with folder repo", () => {
  test("added files in folder repo are properly synced to the main folder", async () => {

    const branchName  = 'testBranch1';
    const commitMsg = 'added some files'

    const newBranch = await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    );
    await folderRepo.checkoutBranch(branchName);

    const testFile1Path = path.resolve(
      folderRepoPath,
      folderPaths[0],
      "testFile1.txt"
    );
    const testFile2Path = path.resolve(
      folderRepoPath,
      folderPaths[1],
      "testFile2.txt"
    );
    const testFile3Path = path.resolve(
      folderRepoPath,
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

    let index = await folderRepo.refreshIndex();
    await index.addByPath(path.relative(folderRepoPath, testFile1Path));
    await index.addByPath(path.relative(folderRepoPath, testFile2Path));
    await index.addByPath(path.relative(folderRepoPath, testFile3Path));
    await index.write();
    const oid = await index.writeTree();
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, "HEAD")
    );
    const addedFiles = await folderRepo.createCommit(
      "HEAD",
      signature,
      signature,
      commitMsg,
      oid,
      [parent]
    );
    await updateMainFromFolder(folderRepoPath, branchName, commitMsg);

    expect(
      await fs.readFile(
        testFile1Path.replace(folderRepoPath, mainRepoPath),
        "utf8"
      )
    ).toBe(testFile1Text);
    expect(
      await fs.readFile(
        testFile2Path.replace(folderRepoPath, mainRepoPath),
        "utf8"
      )
    ).toBe(testFile2Text);
    expect(
      await fs.readFile(
        testFile3Path.replace(folderRepoPath, mainRepoPath),
        "utf8"
      )
    ).toBe(testFile3Text);

    const expectedCommitMessage = (await mainRepo.getMasterCommit()).sha();
    const outputCommitMessage = (await folderRepo.getMasterCommit()).message();
    expect(outputCommitMessage).toBe(expectedCommitMessage);
  });

  test("deleted files in the folder repo are properly synced to the main repo", async () => {

    const branchName  = 'testBranch2';
    const commitMsg = 'deleted some files'

    const newBranch = await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    );
    await folderRepo.checkoutBranch(branchName);


    const testFile1 = (await fs.readdir(path.resolve(folderRepoPath, folderPaths[0])))[0]
    const testFile1Path = path.resolve(folderRepoPath, folderPaths[0], testFile1)
    const testFile2 = (await fs.readdir(path.resolve(folderRepoPath, folderPaths[1])))[0]
    const testFile2Path = path.resolve(folderRepoPath, folderPaths[1], testFile2)
    await fs.remove(testFile1Path)
    await fs.remove(testFile2Path)

    const signature = mainRepo.defaultSignature();
    let index = await folderRepo.refreshIndex();
    await index.remove(path.relative(folderRepoPath, testFile1Path), 0);
    await index.remove(path.relative(folderRepoPath, testFile2Path), 0);
    await index.write();
    const oid = await index.writeTree();
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, "HEAD")
    );
    const addedFiles = await folderRepo.createCommit(
      "HEAD",
      signature,
      signature,
      commitMsg,
      oid,
      [parent]
    );
    await updateMainFromFolder(folderRepoPath, branchName, commitMsg);

    expect(
      await fs.exists(
        testFile1Path.replace(folderRepoPath, mainRepoPath)
      )
    ).toBe(false);
    expect(
      await fs.exists(
        testFile2Path.replace(folderRepoPath, mainRepoPath)
      )
    ).toBe(false);

    const expectedCommitMessage = (await mainRepo.getMasterCommit()).sha();
    const outputCommitMessage = (await folderRepo.getMasterCommit()).message();
    expect(outputCommitMessage).toBe(expectedCommitMessage);

  });
});

