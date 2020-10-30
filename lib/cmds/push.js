const Git = require('nodegit')
const path = require('path')
const fs = require('fs-extra')
const {
  getAllFiles,
  getCurBranch,
  getLastGitSliceCommitHash,
  getTempRepo,
  copyFiles,
  pushTempRepo,
  findFile,
  mergeFromOrigin
} = require('../utils')
const { CONFIG_FILENAME, DEFAULT_BRANCH } = require('../constants')

async function updateMainFromFolder(
  currentDir,
  branchName,
  commitMsg,
  authorName,
  authorEmail,
  password,
  options = {}
) {
  try {
    const { 'force-push': forcePush } = options

    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME))
    let clientRepoUrl = config.repoUrl
    let clientBaseBranchName = config.branch

    if (!clientRepoUrl.includes(`//${authorName}@`)) {
      clientRepoUrl = clientRepoUrl.replace('//', `//${authorName}@`)
    }
    const mainRepoPath = await getTempRepo(
      clientRepoUrl,
      clientBaseBranchName,
      authorName,
      password
    )
    console.log({ mainRepoPath })
    const mainRepo = await Git.Repository.open(mainRepoPath)
    await mainRepo.checkoutBranch(clientBaseBranchName)
    const folderRepo = await Git.Repository.open(currentDir)
    const curBranchName = await getCurBranch(folderRepo)
    if ((await folderRepo.getStatus()).length) {
      throw 'Error: cannot push with uncommitted changes'
    }
    if (curBranchName === DEFAULT_BRANCH) {
      throw 'Error: cannot push from default branch'
    }
    const refsNames = await mainRepo.getReferenceNames(
      Git.Reference.TYPE.LISTALL
    )
    if (refsNames.indexOf(`refs/heads/${branchName}`) === -1) {
      await folderRepo.checkoutBranch(DEFAULT_BRANCH)
      const commitHash = await getLastGitSliceCommitHash(folderRepo)
      await folderRepo.checkoutBranch(curBranchName)
      await mainRepo.createBranch(
        branchName,
        commitHash,
        0 // gives error if the branch already exists
      )
      // at this point,
      // - branch COH-206 (COH-206-CI) has the HEAD points to the last sync commit from client's repo
      // - but branch COH-206 (COH-206-CLIENT) has been raised on client side, and it has conflicts if trying to "Update branch"
      // - COH-206 (COH-206-GS) in our repo has been merged (included resolving conflicts)
      // => if continue in old way, we will try to merge COH-206-CLIENT into COH-206-CI => absolutely get conflicts error
      // => So the idea is trying to merge COH-206-GS into COH-206-CI first then merge COH-206-CLIENT into COH-206-CI then push...
    } else {
      console.log('Branch already exists')
      await mainRepo.checkoutBranch(branchName)
      await mainRepo.setHead(`refs/heads/${branchName}`)

      if (!forcePush) {
        await mergeFromOrigin(mainRepo, branchName, authorName, password)
      }
    }

    // headCommit = (await mainRepo.getHeadCommit()).message()
    // console.log(`After checkout branch Head commit ${branchName}: ` + JSON.stringify({ headCommit }))

    // Merging COH-206-GS into COH-206-CI
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

      const keepFiles = findFile(mainRepoPath, '.keep')
      for (let file of keepFiles)
        await index.addByPath(path.relative(mainRepoPath, file))

      await index.write()
      const oid = await index.writeTree()
      const parent = await mainRepo.getCommit(
        await Git.Reference.nameToId(mainRepo, 'HEAD')
      )
      await mainRepo.createCommit(
        'HEAD',
        signature,
        signature,
        commitMsg || `[${branchName}] : Implementation`,
        oid,
        [parent]
      )

      await pushTempRepo(clientRepoUrl, branchName)

      console.log(`${clientRepoUrl} is updated`)
    } else {
      await pushTempRepo(clientRepoUrl, branchName)
      console.log(`${clientRepoUrl} already up-to-date`)
    }
  } catch (e) {
    return Promise.reject(e)
  }
}

module.exports = updateMainFromFolder
