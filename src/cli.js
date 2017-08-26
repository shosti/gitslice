const argv = require("minimist")(process.argv.slice(2));
const initializeFolder = require("./init.js");
const updateFolderFromMain = require("./pull.js");
const updateMainFromFolder = require("./push.js");

switch (argv._[0]) {
  case "init":
    // git-folder-sync init [repo path] [first/folder/path/from/root] [second/folder/path/from/root] [local folder name]
    initializeFolder(
      argv._[1],
      argv._.slice(2, argv._.length - 1),
      argv._[argv._.length - 1]
    );
    break;
  case "pull":
    // git-folder-sync pull
    // Run this command with in the folder
    updateFolderFromMain();
    break;
  case "push":
    // git-folder-sync push [commit message]
    updateMainFromFolder(argv._[1]);
    break;
  default:
  //showHelp();
}
