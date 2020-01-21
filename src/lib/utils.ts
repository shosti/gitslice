import os from 'os'
import path from 'path'
import hash from 'string-hash'
import Git from 'nodegit'
import fs from 'fs-extra'
import CliProgress from 'cli-progress'
import readlineSync from 'readline-sync'
import nodeFs from 'fs'

let _username: string = null
let _password: string = null

const COMMIT_MSG_PREFIX = 'git-slice:'

const progressBar = new CliProgress.Bar(
  {
    format: '{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}',
  },
  CliProgress.Presets.shades_classic
)

export const ensureArray = <T extends unknown>(input: T | T[] | null): T[] =>
  input ? (Array.isArray(input) ? input : [input]) : []

async function promptForCredentials(url: string) {
  if (!_username || !_password) {
    progressBar.stop()
    console.log(`Credentials required to access ${url}`)

    _username = readlineSync.question('Username: ')
    _password = readlineSync.question('Password: ', { hideEchoBack: true })
  }

  return Git.Cred.userpassPlaintextNew(_username, _password)
}

function transferProgress(stats) {
  if (stats.receivedObjects() === 0)
    progressBar.start(stats.totalObjects(), stats.receivedObjects())

  progressBar.setTotal(stats.totalObjects())
  progressBar.update(stats.receivedObjects())
}

async function cloneRepo(
  mainUrl: string,
  mainRepoPath: string,
  branch: string
) {
  try {
    await fs.remove(mainRepoPath)

    await Git.Clone.clone(mainUrl, mainRepoPath, {
      checkoutBranch: branch,
      fetchOpts: {
        callbacks: {
          certificateCheck: () => 1,
        },
        credentials: promptForCredentials,
        transferProgress,
      },
    })

    progressBar.stop()
  } catch (ex) {
    progressBar.stop()
    console.log(`Unable to clone ${mainUrl}: `, ex)
    throw ex
  }
}

async function updateFromOrigin(
  mainUrl: string,
  repo: Git.Repository,
  branch: string
) {
  try {
    console.log('Pulling', mainUrl)

    await repo.fetch('origin', {
      callbacks: {
        credentials: promptForCredentials,
        transferProgress,
      },
    })
    progressBar.stop()
    await repo.mergeBranches(branch, `origin/${branch}`)
  } catch (error) {
    progressBar.stop()
    console.log(`Unable to update ${mainUrl}: `, error)
    throw error
  }
}

const getTempRepoPath = (url: string): string =>
  path.join(os.tmpdir(), 'git-slice', hash(url).toString())
const setCredentials = (username: string, password: string) => {
  if (username && password) {
    _username = username
    _password = password
  } else if (!_username || !_password) {
    console.log('Credentials required ')

    _username = readlineSync.question('Username: ')
    _password = readlineSync.question('Password: ', { hideEchoBack: true })
  }
}
export const addCommmitMsgPrefix = msg => COMMIT_MSG_PREFIX + msg
export const getAllFiles = async (dir: string) => {
  try {
    let results = []

    const list = await fs.readdir(dir)
    if (!list.length) return results
    for (let file of list) {
      file = path.resolve(dir, file)
      const stat = await fs.stat(file)
      if (stat && stat.isDirectory()) {
        results = results.concat(await getAllFiles(file))
      } else {
        results.push(file)
      }
    }
    return results
  } catch (e) {
    console.log(e)
    return []
  }
}

export async function getTempRepo(
  mainUrl: string,
  branch: string,
  username?: string,
  password?: string
) {
  const mainRepoPath = getTempRepoPath(mainUrl)

  try {
    // Git repo exits so lets just update it
    const repo = await Git.Repository.open(mainRepoPath)
    const origin = await repo.getRemote('origin')

    setCredentials(username, password)

    if (origin.url() === mainUrl)
      await updateFromOrigin(origin.url(), repo, branch)
    else await cloneRepo(mainUrl, mainRepoPath, branch)
  } catch (_e) {
    // Git repo does not exits so lets clone it
    await cloneRepo(mainUrl, mainRepoPath, branch)
  }

  return mainRepoPath
}

const getSinlgeSymlink = async (
  file: string,
  repo: Git.Repository,
  source: string,
  destination: string,
  ignoredFiles: string[]
) => {
  const singleFile = async (sourceFile: string): Promise<string | null> => {
    const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, sourceFile)

    if (!isGitIgnored && !ignoredFiles.includes(sourceFile)) {
      const stats = nodeFs.lstatSync(sourceFile)

      if (stats.isSymbolicLink()) return sourceFile

      const desFile = sourceFile.replace(source, destination)

      await fs.ensureFile(desFile)
      await fs.copy(sourceFile, desFile)

      nodeFs.chmodSync(desFile, (stats.mode & parseInt('777', 8)).toString(8))
    }
  }

  const allFiles = await getAllFiles(path.resolve(source, file))
  const symlinks = []

  for (const sourceFile of allFiles) {
    const symLink = await singleFile(sourceFile)

    if (symLink) symlinks.push(symLink)
  }

  return symlinks
}

export const copyFiles = async (
  source: string,
  destination: string,
  folders: string[],
  ignored: string[]
) => {
  let symbolicLinks = []

  const repo = await Git.Repository.open(source)

  const ignoredFiles = ignored.map(f => path.resolve(source, f))

  for (let p of folders) {
    const symLink = await getSinlgeSymlink(
      p,
      repo,
      source,
      destination,
      ignoredFiles
    )

    symbolicLinks = [...symbolicLinks, ...symLink]
  }

  for (let sourceFile of symbolicLinks) {
    const desFile = sourceFile.replace(source, destination)
    await fs.ensureDir(path.resolve(desFile, '../'))
    nodeFs.symlinkSync(nodeFs.readlinkSync(sourceFile), desFile)
  }
}

export const deleteFiles = async (source: string, ignored: string[]) => {
  const repo = await Git.Repository.open(source)

  const ignoredFiles = ignored.map(f => path.resolve(source, f))
  const files = await getAllFiles(source)

  for (let file of files) {
    const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, file)

    if (!isGitIgnored && !ignoredFiles.includes(file)) {
      await fs.remove(file)
    }
  }
}

export const findFile = (startPath: string, filter: string): string[] => {
  if (!fs.existsSync(startPath)) {
    console.log('This is not a directory', startPath)

    return []
  }

  return fs.readdirSync(startPath).reduce((acc, file) => {
    const filepath = path.join(startPath, file)
    const isDirectory = fs.lstatSync(filepath).isDirectory()
    if (isDirectory) return [...acc, findFile(filepath, filter)]

    return [...acc, filepath]
  }, [])
}

export const getAccessEndpointFromRepoUrl = (repoUrl: string) => {
  repoUrl = repoUrl.replace(/\/\/.*@/gm, '//')

  return repoUrl.substr(0, repoUrl.lastIndexOf('/'))
}

export const getClientName = (repoName: string) => repoName.split('-')[1]

export const getCurBranch = async (repo: Git.Repository) => (await repo.getCurrentBranch()).name().replace('refs/heads/', '');

export const getLastGitSliceCommitHash = async (repo: Git.Repository): Promise<string> => {
  const revwalk = Git.Revwalk.create(repo)
  revwalk.pushHead()
  const commits = await revwalk.getCommitsUntil(c => true)
  const commit = commits
    .find(x => x.message().indexOf(COMMIT_MSG_PREFIX) === 0)
    .message()
  return commit.replace(COMMIT_MSG_PREFIX, '')
}

export const pushTempRepo = async (repoUrl: string, branch: string) => {
  try {
    const mainRepoPath = getTempRepoPath(repoUrl)
    const repo = await Git.Repository.open(mainRepoPath)
    const origin = await repo.getRemote('origin')

    await origin.push([`refs/heads/${branch}:refs/heads/${branch}`], {
      callbacks: {
        credentials: promptForCredentials,
        transferProgress,
      },
    })
    progressBar.stop()
  } catch (e) {
    progressBar.stop()
    return Promise.reject(`Unable to push to ${repoUrl}: ${e.toString()}`)
  }
}

export const createOrPullBranch = async (repo: Git.Repository, branchName: string, commitHash: string) => {
  const refs = await repo.getReferenceNames(Git.Reference.TYPE.LISTALL)

  if (refs.indexOf(`refs/heads/${branchName}`) == -1) {
    console.log('Creating a new local branch...')
    await repo.createBranch(branchName, commitHash, false)
  }

  if (refs.indexOf(`refs/remotes/origin/${branchName}`) >= 0) {
    console.log('Updating the local branch from remote...')
    await repo.mergeBranches(
      `refs/heads/${branchName}`,
      `refs/remotes/origin/${branchName}`
    )
  }
}