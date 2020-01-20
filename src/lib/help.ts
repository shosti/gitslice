import { Helptype } from '@customTypes/help'

const getUsage = require('command-line-usage')

export default (command?: string) => {
  const intro: Helptype[] = [
    {
      header: 'git-slice',
      content:
        'A utility which can be used to take out a folder from a git repository, fork it into a new git repository and eventually provide commands to sync changes between both the repositories.'
    },
    {
      header: 'Commands'
    }
  ]

  const init: Helptype[] = [
    {
      content: [
        '[bold]{git-slice init} [italic]{folder-name}',
        'Create a new folder in the current directory, initiate it into a new git repository and copy the specified (one or more) folders from the primary repo into it.'
      ]
    },
    {
      optionList: [
        {
          name: 'repo',
          typeLabel: '[underline]{path} (required)',
          description: 'Relative path of the git repository to be sliced'
        },
        {
          name: 'branch',
          typeLabel: '[underline]{branch-name} (required)',
          description: 'Name of the repository branch to be sliced'
        },
        {
          name: 'folder',
          typeLabel: '[underline]{path} (required)',
          description:
            'Path of the folder from the repository root (use this option multiple times for multiple folders)'
        }
      ]
    }
  ]

  const pull: Helptype[] = [
    {
      content: [
        '[bold]{git-slice pull}',
        'Sync updates from the primary repo into the sliced repo.'
      ]
    }
  ]

  const push: Helptype[] = [
    {
      content: [
        '[bold]{git-slice push}',
        'Create a new branch in the primary repo, sync changes made in the sliced repo into that branch and commit those changes with the specified commit message.'
      ]
    },
    {
      optionList: [
        {
          name: 'branch',
          typeLabel: '[underline]{branch-name} (required)',
          description:
            'Name of the branch to be created in the main git repository while pushing'
        },
        {
          name: 'message',
          typeLabel: '[underline]{commit-message} (required)',
          description:
            'Commit mesasge used to commit changes in the main git reposirory'
        },
        {
          name: 'author-name',
          typeLabel: '[underline]{author-name} (required)',
          description:
            'Name of the author which will be used to commit in the main repository'
        },
        {
          name: 'author-email',
          typeLabel: '[underline]{author-email} (required)',
          description:
            'Email of the author which will be used to commit in the main repository'
        }
      ]
    }
  ]

  try {
    switch (command) {
      case 'init':
        console.log(getUsage(init))
        break
      case 'pull':
        console.log(getUsage(pull))
        break
      case 'push':
        console.log(getUsage(push))
        break
      default:
        console.log(getUsage([...intro, ...init, ...pull, ...push]))
    }
  } catch (e) {
    console.log(e)
  }
}
