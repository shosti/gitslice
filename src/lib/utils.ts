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
    format: '{bar} {percentage}% | ETA: {eta_formatted} | {value}/{total}'
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
          certificateCheck: () => 1
        },
        credentials: promptForCredentials,
        transferProgress
      }
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
        transferProgress
      }
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
const getAllFiles = async (dir: string) => {
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
    const symLink = singleFile(sourceFile)
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
