#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const path = require('path');
const initializeFolder = require("../lib/init.js");
const updateFolderFromMain = require("../lib/pull.js");
const updateMainFromFolder = require("../lib/push.js");

async function parseArgs(currentDir, command, args) {
  switch (command) {
    case "init":
      // git-folder-sync init [repo path] [first/folder/path/from/root] [second/folder/path/from/root] [local folder name]
      const repo = args[0];
      const folders = args.slice(1, -1);
      const forkedRepo = args[args.length - 1];
      const repoName = path.basename(repo);
      const forkedName = path.basename(forkedRepo);
      const folderPaths = folders.map(fd => `${repoName}/${fd}`);
      console.log(`Initializing ${forkedName} from ${folderPaths.join(', ')} ...`);
      await initializeFolder(
        path.resolve(currentDir, repo),
        folders,
        path.resolve(currentDir, forkedRepo)
      );
      console.log(`Successfully forked into ${forkedRepo}`);
      break;
    case "pull":
      // git-folder-sync pull
      // Run this command with in the folder
      updateFolderFromMain();
      break;
    case "push":
      // git-folder-sync push [commit message]
      const [ message ] = args;
      updateMainFromFolder(message);
      break;
    default:
    // showHelp();
  }
}

const { _: [ command, ...args ] } = argv;
const dir = process.cwd();
parseArgs(dir, command, args);