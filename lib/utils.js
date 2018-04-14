const fs = require('fs-extra')
const path = require('path')
const Git = require('nodegit')
const readlineSync = require('readline-sync')
const hash = require('string-hash')
const { URL } = require('url')
const os = require('os')
const CliProgress = require('cli-progress')
var gitCredentialHelper = require('git-credential-helper')
const COMMIT_MSG_PREFIX = 'git-slice:'

const progressBar = new CliProgress.Bar({}, CliProgress.Presets.shades_classic)

async function getAllFiles(dir) {
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

async function getCurBranch(repo) {
  return (await repo.getCurrentBranch()).name().replace('refs/heads/', '')
}

function addCommmitMsgPrefix(msg) {
  return COMMIT_MSG_PREFIX + msg
}

function removeCommitMsgPrefix(msg) {
  return msg.replace(COMMIT_MSG_PREFIX, '')
}

function ensureArray(input) {
  if (!input) {
    return []
  } else {
    return Array.isArray(input) ? input : [input]
  }
}

async function getLastGitSliceCommitHash(repo) {
  const revwalk = Git.Revwalk.create(repo)
  revwalk.pushHead()
  const commits = await revwalk.getCommitsUntil(c => true)
  const commit = commits
    .find(x => x.message().indexOf(COMMIT_MSG_PREFIX) === 0)
    .message()
  return commit.replace(COMMIT_MSG_PREFIX, '')
}

function promptForCredentials(url, existingUserName) {
  progressBar.stop()
  console.log(`Credentials required to access ${url}`)
  const username = readlineSync.question('Username: ')
  const password = readlineSync.question('Password: ', {
    hideEchoBack: true
  })

  gitCredentialHelper.approve(url, () => {}, {
    username,
    password
  })

  progressBar.start()
  return Git.Cred.userpassPlaintextNew(username, password)
}

function transferProgress(stats) {
  progressBar.setTotal(stats.totalObjects())
  progressBar.update(stats.receivedObjects())
}

function getGitCredentials(repoUrl) {
  return new Promise((resolve, reject) => {
    gitCredentialHelper.fill(repoUrl, function(err, data) {
      resolve(data)
    })
  })
}

async function cloneRepo(mainUrl, mainRepoPath, branch) {
  console.log('fetching fresh repo: ', mainUrl)
  try {
    await fs.remove(mainRepoPath)
    progressBar.start(100, 0)

    const { username, password } = await getGitCredentials(mainUrl)
    const parsedUrl = new URL(mainUrl)
    if (username && password) {
      parsedUrl.username = username
      parsedUrl.password = password
    }
    await Git.Clone.clone(parsedUrl.href, mainRepoPath, {
      checkoutBranch: branch,
      fetchOpts: {
        callbacks: {
          credentials: promptForCredentials,
          transferProgress
        }
      }
    })
    progressBar.stop()
  } catch (ex) {
    progressBar.stop()
    return Promise.reject(`Unable to clone ${mainUrl}: `, ex.toString())
  }
}

async function updateFromOrigin(mainUrl, repo, branch) {
  console.log('fetching latest changes for: ', mainUrl)
  try {
    progressBar.start(100, 0)
    await repo.fetch('origin', {
      callbacks: {
        credentials: promptForCredentials,
        transferProgress
      }
    })
    progressBar.stop()
    await repo.mergeBranches(branch, `origin/${branch}`)
  } catch (e) {
    progressBar.stop()
    return Promise.reject(`Unable to update ${mainUrl}: `, e.toString())
  }
}

async function getTempRepo(mainUrl, branch) {
  const mainRepoPath = getTempRepoPath(mainUrl)
  try {
    // Git repo exits so lets just update it
    const repo = await Git.Repository.open(mainRepoPath)
    const origin = await repo.getRemote('origin')
    if (origin.url() === mainUrl) {
      await updateFromOrigin(origin.url(), repo, branch)
    } else {
      await cloneRepo(mainUrl, mainRepoPath, branch)
    }
  } catch (e) {
    // Git repo does not exits so lets clone it
    await cloneRepo(mainUrl, mainRepoPath, branch)
  }
  return mainRepoPath
}

function getTempRepoPath(url) {
  return path.join(os.tmpdir(), 'git-slice', hash(url).toString())
}

async function pushTempRepo(repoUrl, branch) {
  const mainRepoPath = getTempRepoPath(repoUrl)
  const repo = await Git.Repository.open(mainRepoPath)
  const origin = await repo.getRemote('origin')
  await origin.push([`+refs/heads/${branch}:refs/heads/${branch}`], {
    callbacks: {
      credentials: promptForCredentials
    }
  })
}

async function copyFiles(source, destination, folders, ignored) {
  const repo = await Git.Repository.open(source)
  const ignoredFiles = ignored.map(f => path.resolve(source, f))
  for (let p of folders) {
    const allFiles = await getAllFiles(path.resolve(source, p))
    for (let sourceFile of allFiles) {
      const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, sourceFile)
      if (!isGitIgnored && ignoredFiles.indexOf(sourceFile) === -1) {
        const desFile = sourceFile.replace(source, destination)
        await fs.ensureFile(desFile)
        await fs.copy(sourceFile, desFile)
      }
    }
  }
}

async function deleteFiles(source, ignored) {
  const repo = await Git.Repository.open(source)
  const ignoredFiles = ignored.map(f => path.resolve(source, f))
  for (let file of await getAllFiles(source)) {
    const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, file)
    if (!isGitIgnored && ignoredFiles.indexOf(file) === -1) {
      await fs.remove(file)
    }
  }
}

module.exports = {
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix,
  ensureArray,
  getLastGitSliceCommitHash,
  getTempRepo,
  copyFiles,
  deleteFiles,
  pushTempRepo,
  getTempRepoPath
}
