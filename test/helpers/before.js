const Git = require('nodegit')
const fs = require('fs-extra')
const {
  getTempRepo,
  copyFiles,
  addCommmitMsgPrefix
} = require('../../lib/utils')
const { CONFIG_FILENAME } = require('../../lib/constants')

const folderPaths = ['bin', 'tests'] // to be modified with the repo
const repoToClone = 'https://github.com/murcul/git-slice.git'
const branchName = 'master'

module.exports = async function(folderRepoPath) {
  const config = {
    repoUrl: repoToClone,
    folders: folderPaths,
    branch: branchName,
    ignore: [CONFIG_FILENAME]
  }
  const mainRepoPath = await getTempRepo(repoToClone, branchName)
  await fs.ensureDir(folderRepoPath)
  const mainRepo = await Git.Repository.open(mainRepoPath)
  await mainRepo.checkoutBranch(branchName)
  const folderRepo = await Git.Repository.init(folderRepoPath, 0)
  await copyFiles(mainRepoPath, folderRepoPath, folderPaths, config.ignore)

  await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config, {
    spaces: 2
  })
  const signature = folderRepo.defaultSignature()
  let index = await folderRepo.refreshIndex()
  for (let addFilePath of (await folderRepo.getStatus()).map(file =>
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
    main: mainRepoPath,
    folder: folderRepo
  }
}
