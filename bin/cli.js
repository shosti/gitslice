#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const path = require("path");
const initializeFolder = require("../lib").init;
const updateFolderFromMain = require("../lib").pull;
const updateMainFromFolder = require("../lib").push;
const showHelp = require("../lib").help;

async function parseArgs(currentDir, command, args, argv) {
  switch (command) {
    case "init":
      // git-slice init [repo path] [first/folder/path/from/root] [second/folder/path/from/root] [local folder name]
      if (args.length > 2) {
        const repo = args[0];
        const folders = args.slice(1, -1);
        const forkedRepo = args[args.length - 1];
        const repoName = path.basename(repo);
        const forkedName = path.basename(forkedRepo);
        const folderPaths = folders.map(fd => `${repoName}/${fd}`);
        console.log(
          `Initializing ${forkedName} from ${folderPaths.join(", ")} ...`
        );
        await initializeFolder(
          path.resolve(currentDir, repo),
          folders,
          path.resolve(currentDir, forkedRepo)
        );
        console.log(`Successfully forked into ${forkedRepo}`);
      } else {
        console.log(
          "Invalid arguments, the arguments should follow the following format: git-slice init [relative path to repo] [first/folder/path/from/root] [second/folder/path/from/root] [name of new folder]"
        );
      }
      break;
    case "pull":
      // git-slice pull
      await updateFolderFromMain(currentDir);
      break;
    case "push":
      // git-slice push [branch name] -m "[commit message]"
      const [branchName] = args;
      const commitMsg = argv.m;
      if (branchName && commitMsg) {
        await updateMainFromFolder(currentDir, branchName, commitMsg);
      } else {
        console.log(
          `Invalid arguments, the arguments should follow the following format: git-slice push [branch name] -m "[commit message]"`
        );
      }
      break;
    default:
      showHelp();
  }
}

const { _: [command, ...args], help } = argv;
if (help) {
  showHelp();
} else {
  const dir = process.cwd();
  parseArgs(dir, command, args, argv);
}
