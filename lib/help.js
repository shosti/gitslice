const getUsage = require("command-line-usage");
function showHelp() {
  try {
    const sections = [
      {
        header: "git-slice",
        content:
          "A utility which can be used to take out a folder from a git repository, fork it into a new git repository and eventually provide commands to sync changes between both the repositories."
      },
      {
        header: "Synopsis",
        content: "git-slice <command> <arg1> <arg2> ..."
      },
      {
        header: "Command: git-slice init",
        content: [
          "[bold]{git-slice init} [italic]{<relative/path/to/repo>} [italic]{<first/folder/path/from/root>} [italic]{<second/folder/path/from/root>} [italic]{<folder-name>}",
          "",
          "Create a new folder in the current directory, initiate it into a new git repository and copy the specified (one or more) folders from the primary repo into it."
        ]
      },
      {
        header: "Command: git-slice pull",
        content: [
          "[bold]{git-slice pull}",
          "",
          "Sync updates from the primary repo into the sliced repo."
        ]
      },
      {
        header: "Command: git-slice push",
        content: [
          "[bold]{git-slice push} [italic]{<branch-name>}  -m '[italic]{commit message}'",
          "",
          "Create a new branch in the primary repo, sync changes made in the sliced repo into that branch and commit those changes with the specified commit message."
        ]
      }
    ];
    console.log(getUsage(sections));
  } catch (e) {
    console.log(e);
  }
}

module.exports = showHelp;
