#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const path = require("path");
const initializeFolder = require("../lib/cmds/init");
const updateFolderFromMain = require("../lib/cmds/pull");
const updateMainFromFolder = require("../lib/cmds/push");
const showHelp = require("../lib/help");

const invalidCmdError =
  "Invalid arguments, following are the usage details of this command:";

async function parseArgs(currentDir, command, args, argv) {
  switch (command) {
    case "init":
      if (argv.repo && argv.folder && args.length) {
        const repo = argv.repo;
        const folders = argv.folder;
        const forkedRepo = args[0];
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
        console.log(invalidCmdError);
        showHelp(command);
      }
      break;
    case "pull":
      await updateFolderFromMain(currentDir);
      break;
    case "push":
      const branchName = argv.branch;
      const commitMsg = argv.m;
      if (branchName && commitMsg) {
        await updateMainFromFolder(currentDir, branchName, commitMsg);
      } else {
        console.log(invalidCmdError);
        showHelp(command);
      }
      break;
    default:
      showHelp();
  }
}

const { _: [command, ...args], help } = argv;
if (help) {
  showHelp(command);
} else {
  const dir = process.cwd();
  parseArgs(dir, command, args, argv);
}
