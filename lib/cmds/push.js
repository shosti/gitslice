const Git = require('nodegit')
const path = require('path')
const fs = require('fs-extra')
const {
  getClientRepository,
  getClientCommitMessage
} = require('../graphlql/query')
const { updatePushDetailInTask } = require('../graphlql/mutations')
const {
  getAllFiles,
  getCurBranch,
  getLastGitSliceCommitHash,
  getTempRepo,
  copyFiles,
  pushTempRepo
} = require('../utils')
const { CONFIG_FILENAME } = require('../constants')

const { CIRCLE_REPOSITORY_URL, CIRCLE_PULL_REQUEST } = process.env

async function updateMainFromFolder(
  currentDir,
  branchName,
  commitMsg,
  authorName,
  authorEmail,
  password
) {
  try {
    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME))
    await updateDatabaseFromConfig(config, CIRCLE_REPOSITORY_URL)
    const [
      { clientRepoUrl, clientBaseBranchName },
      { clientCommitMessage }
    ] = await Promise.all([
      getClientRepository(CIRCLE_REPOSITORY_URL),
      getClientCommitMessage(CIRCLE_PULL_REQUEST)
    ])
    const mainRepoPath = await getTempRepo(
      clientRepoUrl,
      clientBaseBranchName,
      authorName,
      password
    )
    const mainRepo = await Git.Repository.open(mainRepoPath)
    await mainRepo.checkoutBranch(clientBaseBranchName)
    const folderRepo = await Git.Repository.open(currentDir)
    const curBranchName = await getCurBranch(folderRepo)
    if ((await folderRepo.getStatus()).length) {
      throw 'Error: cannot push with uncommitted changes'
    }
    if (curBranchName === 'master') {
      throw 'Error: cannot push from master branch'
    }
    if (
      (await mainRepo.getReferenceNames(Git.Reference.TYPE.LISTALL)).indexOf(
        `refs/heads/${branchName}`
      ) === -1
    ) {
      await folderRepo.checkoutBranch('master')
      const commitHash = await getLastGitSliceCommitHash(folderRepo)
      await folderRepo.checkoutBranch(curBranchName)
      const newBranch = await mainRepo.createBranch(
        branchName,
        commitHash,
        0 // gives error if the branch already exists
      )
    } else {
      console.log('Branch already exists')
    }
    await mainRepo.checkoutBranch(branchName)
    await mainRepo.setHead(`refs/heads/${branchName}`)

    for (let p of config.folders) {
      for (let file of await getAllFiles(path.resolve(mainRepoPath, p))) {
        if (
          !await Git.Ignore.pathIsIgnored(mainRepo, file) &&
          config.ignore.indexOf(path.relative(mainRepoPath, file)) === -1
        ) {
          await fs.remove(file)
        }
      }
    }

    await copyFiles(currentDir, mainRepoPath, config.folders, config.ignore)

    const repoStatus = await mainRepo.getStatus()
    if (repoStatus.length) {
      const signature = Git.Signature.now(authorName, authorEmail)
      let index = await mainRepo.refreshIndex()
      for (let deletedFilePath of repoStatus
        .filter(file => file.isDeleted())
        .map(file => file.path())) {
        await index.remove(deletedFilePath, 0)
      }
      for (let addOrModifiedFilePath of repoStatus
        .filter(file => !file.isDeleted())
        .map(file => file.path())) {
        await index.addByPath(addOrModifiedFilePath)
      }
      await index.write()
      const oid = await index.writeTree()
      const parent = await mainRepo.getCommit(
        await Git.Reference.nameToId(mainRepo, 'HEAD')
      )
      await mainRepo.createCommit(
        'HEAD',
        signature,
        signature,
        clientCommitMessage,
        oid,
        [parent]
      )
      await pushTempRepo(clientRepoUrl, clientBaseBranchName)

      const pushedCommitSHA = (await folderRepo.getHeadCommit()).sha()
      const clientCommitSHA = (await mainRepo.getHeadCommit()).sha()

      await updatePushDetailInTask({
        prLink: CIRCLE_PULL_REQUEST,
        clientCommitSHA,
        pushedCommitSHA
      })
      console.log(`${clientRepoUrl} is updated`)
    } else {
      await pushTempRepo(clientRepoUrl, clientBaseBranchName)
      console.log(`${clientRepoUrl} already up-to-date`)
    }
  } catch (e) {
    return Promise.reject(e)
  }
}

module.exports = updateMainFromFolder
