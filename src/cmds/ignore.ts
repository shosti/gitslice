import Git from 'nodegit';
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';

import { CONFIG_FILENAME } from '@lib/constants';
import { GitSliceConfigType } from '@customTypes/graphql';

export default async (currentDir: string, filesToAdd: string[], filesToRemove: string[]) => {
  try {
    const config: GitSliceConfigType = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME))

    const folderRepo = await Git.Repository.open(currentDir)
    await folderRepo.checkoutBranch('master', new Git.CheckoutOptions())

    const commonFileExists = filesToAdd.some(function(v) {
      return filesToRemove.indexOf(v) >= 0
    })

    if (commonFileExists) {
      throw 'Error: Both add and remove operation is being performed on the same file'
    }

    let updatedIgnoredFiles = config.ignore

    if (filesToAdd.length) {
      updatedIgnoredFiles = _.uniq([...updatedIgnoredFiles, ...filesToAdd])
    }
    
    if (filesToRemove.length) {
      updatedIgnoredFiles = updatedIgnoredFiles.filter(
        x => filesToRemove.indexOf(x) === -1
      )
    }
    await fs.writeJson(
      path.resolve(currentDir, CONFIG_FILENAME),
      {
        ...config,
        ignore: updatedIgnoredFiles,
      },
      { spaces: 2 }
    )
    let index = await folderRepo.refreshIndex()
    await index.addByPath(CONFIG_FILENAME)
    await index.write()
    const oid = await index.writeTree()
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    )
    const signature = folderRepo.defaultSignature()
    await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      `updated ${CONFIG_FILENAME}`,
      oid,
      [parent]
    )

    console.log(`Ignored files are sucessfully updated`)
  } catch (e) {
    return Promise.reject(e)
  }
}
