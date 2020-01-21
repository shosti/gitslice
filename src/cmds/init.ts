import Git from 'nodegit'
import fs from 'fs-extra'
import path from 'path'

import { addCommmitMsgPrefix, getTempRepo, copyFiles } from '@lib/utils'
import { CONFIG_FILENAME } from '@lib/constants'

export default async (
  repoUrl: string,
  folderPaths: string[],
  forkedRepo: string,
  branchName: string
) => {
  try {
    const folderRepoPath = path.resolve(process.cwd(), forkedRepo)

    const config = {
      repoUrl,
      folders: folderPaths,
      branch: branchName,
      ignore: [CONFIG_FILENAME],
    }

    const mainRepoPath = await getTempRepo(repoUrl, branchName)

    await fs.ensureDir(folderRepoPath)

    const mainRepo = await Git.Repository.open(mainRepoPath)
    await mainRepo.checkoutBranch(branchName)

    const folderRepo = await Git.Repository.init(folderRepoPath, 0)

    await copyFiles(mainRepoPath, folderRepoPath, folderPaths, config.ignore)

    await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config, {
      spaces: 2,
    })

    const signature = folderRepo.defaultSignature()
    const index = await folderRepo.refreshIndex()

    const filePaths = (await folderRepo.getStatus()).map(file => file.path())

    for (let addFilePath of filePaths) {
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
  } catch (error) {
    console.log(error)
  }
}
