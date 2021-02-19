const Git = require('nodegit')
const fs = require('fs-extra')
const {
  getTempRepoPath,
  copyFiles,
  cloneRepo,
  addCommmitMsgPrefix,
} = require('../../lib/utils')
const { CONFIG_FILENAME } = require('../../lib/constants')

const repoToClone = 'https://github.com/GitStartHQ/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const branchName = 'master'

module.exports = async function before(folderRepoPath) {
  const config = {
    repoUrl: repoToClone,
    folders: folderPaths,
    branch: branchName,
    ignore: [CONFIG_FILENAME],
  }
  const mainRepoPath = getTempRepoPath(repoToClone)
  let mainRepo
  try {
    // Git repo exists so lets just update it
    mainRepo = await Git.Repository.open(mainRepoPath)
  } catch (e) {
    // Git repo does not exits so lets clone it
    mainRepo = await cloneRepo(repoToClone, mainRepoPath, branchName)
  }

  const folderRepo = await Git.Repository.init(folderRepoPath, 0)

  await copyFiles(mainRepoPath, folderRepoPath, folderPaths, [CONFIG_FILENAME])
  await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config, {
    spaces: 2,
  })
  const signature = await folderRepo.defaultSignature()
  let index = await folderRepo.refreshIndex()
  for (let addFilePath of (await folderRepo.getStatus()).map((file) =>
    file.path()
  )) {
    await index.addByPath(addFilePath)
  }
  await index.write()
  const oid = await index.writeTree()
  await folderRepo.createCommit(
    'HEAD',
    signature,
    signature,
    addCommmitMsgPrefix((await mainRepo.getHeadCommit()).sha()),
    oid,
    null
  )

  return {
    main: mainRepo,
    folder: folderRepo,
  }
}
