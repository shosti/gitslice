const Git = require('nodegit')
const fs = require('fs-extra')
const path = require('path')
const {
  getTempRepoPath,
  copyFiles,
  addCommmitMsgPrefix
} = require('../../lib/utils')
const parseArgsAndExecute = require('../../lib')
const { CONFIG_FILENAME } = require('../../lib/constants')

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const branchName = 'master'

module.exports = async function before(folderRepoRelativePath, folderRepoPath) {
  let mainRepoPath
  let folderRepo
  if (!fs.existsSync(mainRepoPath)) {
    const initCmd = `init ${folderRepoRelativePath} --repo ${repoToClone} --folder ${
      folderPaths[0]
    } --folder ${folderPaths[1]} --branch ${branchName}`

    mainRepoPath = getTempRepoPath(repoToClone)
    await parseArgsAndExecute(path.join(__dirname, '..'), initCmd.split(' '))
    folderRepo = await Git.Repository.open(folderRepoPath)
  } else {
    const config = {
      repoUrl: repoToClone,
      folders: folderPaths,
      branch: branchName,
      ignore: [CONFIG_FILENAME]
    }
    const mainRepo = await Git.Repository.open(mainRepoPath)
    folderRepo = await Git.Repository.init(folderRepoPath, 0)
    await copyFiles(mainRepoPath, folderRepoPath, folderPaths, [
      CONFIG_FILENAME
    ])
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
    mainRepoPath = getTempRepoPath(repoToClone)
    await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      addCommmitMsgPrefix((await mainRepo.getHeadCommit()).sha()),
      oid,
      null
    )
  }

  return {
    main: mainRepoPath,
    folder: folderRepo
  }
}
