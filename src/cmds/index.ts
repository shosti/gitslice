import minimist from 'minimist'

import showHelp from '@lib/help'
import { INVALID_ARG_MSG } from '@lib/constants'
import { InitCommandType } from '@customTypes/cmd'
import { ensureArray } from '@lib/utils'
import initializeFolder from '@cmds/init'

// const minimist = require('minimist')
// const path = require('path')
// const initializeFolder = require('./cmds/init')
// const updateFolderFromMain = require('./cmds/pull')
// const updateMainFromFolder = require('./cmds/push')
// const modifyIgnoredFiles = require('./cmds/ignore')
// const showHelp = require('./help')
// const { INVALID_ARG_MSG } = require('./constants')
// const { ensureArray } = require('./utils')
const initCommand = async ({ repo, folder, branch, args }: InitCommandType) => {
  const [forkedRepo] = args
  const folders = ensureArray(folder)

  const branchName = branch || 'master'

  console.log(`Initializing ${forkedRepo} from ${repo} branch ${branchName}`)

  await initializeFolder(repo, folders, forkedRepo, branchName)

  console.log(`Successfully forked into ${forkedRepo}`)
}

export default async (currentDir: string, inputArgs: string[]) => {
  const argv = minimist(inputArgs)

  const { _: [command, ...args], help } = argv

  if (help) return showHelp(command)

  switch (command) {
    case 'init':
      const { repo, folder } = argv
      if (!(repo && folder && args.length)) {
        console.log(INVALID_ARG_MSG)
        return showHelp(command)
      }

      await initCommand({ ...argv, args })

      break
    // case 'pull':
    //   await updateFolderFromMain(
    //     currentDir,
    //     argv['username'],
    //     argv['password']
    //   )
    //   break
    // case 'push':
    //   if (
    //     argv.branch &&
    //     argv.message &&
    //     argv['author-name'] &&
    //     argv['author-email']
    //   ) {
    //     await updateMainFromFolder(
    //       currentDir,
    //       argv.branch,
    //       argv.message,
    //       argv['author-name'],
    //       argv['author-email'],
    //       argv['password']
    //     )
    //   } else {
    //     console.log(INVALID_ARG_MSG)
    //     showHelp(command)
    //   }
    //   break
    // case 'ignore':
    //   if (argv.add || argv.remove) {
    //     const filesToAdd = ensureArray(argv.add)
    //     const filesToRemove = ensureArray(argv.remove)
    //     await modifyIgnoredFiles(currentDir, filesToAdd, filesToRemove)
    //   } else {
    //     console.log(INVALID_ARG_MSG)
    //     showHelp(command)
    //   }
    //   break
    default:
      showHelp()
  }
}
