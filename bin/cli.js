#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const path = require("path");
const initializeFolder = require("../lib/init.js");
const updateFolderFromMain = require("../lib/pull.js");
const updateMainFromFolder = require("../lib/push.js");

async function parseArgs(currentDir, command, args) {
  switch (command) {
    case "init":
      // git-fork init [repo path] [first/folder/path/from/root] [second/folder/path/from/root] [local folder name]
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
        console.log("Error: Invalid arguments");
      }
      break;
    case "pull":
      // git-fork pull
      updateFolderFromMain(currentDir);
      break;
    case "push":
      // git-fork push [branch name] [commit message]
      const [commitMsg, branchName] = args;
      if (commitMsg && branchName) {
        updateMainFromFolder(currentDir, commitMsg, branchName);
      } else {
        console.log("Error: Invalid arguments");
      }
      break;
    default:
    // showHelp();
  }
}

const { _: [command, ...args] } = argv;
const dir = process.cwd();
parseArgs(dir, command, args);
