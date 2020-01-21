import minimist from 'minimist'

import showHelp from '@lib/help'
import { INVALID_ARG_MSG } from '@lib/constants'
import { InitCommandType } from '@customTypes/cmd'
import { ensureArray } from '@lib/utils'
import initializeFolder from '@cmds/init'
import pullRepo from '@cmds/pull'
import pushRepo from '@cmds/push';
import modifyIgnoredFiles from '@cmds/ignore';

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

  const { username, password, branch } = argv

  switch (command) {
    case 'init':
      const { repo, folder } = argv

      if (!(repo && folder && args.length)) {
        console.log(INVALID_ARG_MSG)
        return showHelp(command)
      }

      await initCommand({ branch, repo, folder, args })
      break
    case 'pull':

      await pullRepo(currentDir, username, password)
      break
    case 'push':
      const { message, 'author-email': authorEmail, 'author-name': authorName} = argv; 

      if (!(branch && message && authorName && authorEmail )) {
        console.log(INVALID_ARG_MSG)
        showHelp(command)
      }

      await pushRepo(currentDir, branch, message, authorName, authorEmail, password);

      break;
    case 'ignore':
      if (argv.add || argv.remove) {
        const filesToAdd = ensureArray(argv.add)
        const filesToRemove = ensureArray(argv.remove)
        
        await modifyIgnoredFiles(currentDir, filesToAdd, filesToRemove)
      } else {
        console.log(INVALID_ARG_MSG)
        showHelp(command)
      }
      break
    default:
      showHelp()
  }
}
