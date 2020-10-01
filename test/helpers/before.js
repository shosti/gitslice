const Git = require('nodegit')
const fs = require('fs-extra')
const {
  getTempRepoPath,
  copyFiles,
  addCommmitMsgPrefix
} = require('../../lib/utils')
const { CONFIG_FILENAME } = require('../../lib/constants')

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const branchName = 'master'
const userName = process.env.GITHUB_USER_NAME
const userPassword = process.env.GITHUB_PASSWORD

module.exports = async function before(folderRepoPath) {
  const config = {
    repoUrl: repoToClone,
    folders: folderPaths,
    branch: branchName,
    ignore: [CONFIG_FILENAME]
  }
  const mainRepoPath = getTempRepoPath(repoToClone)

  await fs.remove(mainRepoPath)

  const mainRepo = await Git.Clone.clone(repoToClone, mainRepoPath, {
    fetchOpts: {
      callbacks: {
        credentials: () => {
          return Git.Cred.userpassPlaintextNew(userName, userPassword)
        }
      }
    }
  })

  await fs.remove(folderRepoPath)

  const folderRepo = await Git.Repository.init(folderRepoPath, 0)

  await copyFiles(mainRepoPath, folderRepoPath, folderPaths, [CONFIG_FILENAME])
  await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config, {
    spaces: 2
  })

  const signature = await folderRepo.defaultSignature()
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
    []
  )

  return {
    main: mainRepo,
    folder: folderRepo
  }
}
