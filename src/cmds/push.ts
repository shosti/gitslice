import Git from 'nodegit';
import path from 'path';
import fs from 'fs-extra';

import { getClientRepository, getClientCommitMessage, getClientCreds, } from '@graphql/query';
import { addPushCommitInTask, upsertDatabaseFromConfig } from '@graphql/mutations';
import { getAllFiles, getCurBranch, getLastGitSliceCommitHash, getTempRepo, copyFiles, pushTempRepo, findFile, createOrPullBranch } from '@lib/utils';
import { CONFIG_FILENAME } from '@lib/constants';
import { GitSliceConfigType } from '@customTypes/graphql';

const { CIRCLE_REPOSITORY_URL, CIRCLE_PULL_REQUEST } = process.env

export default async (currentDir: string, branchName: string, commitMsg: string, authorName: string, authorEmail: string, password: string) => {
  try {
    const config: GitSliceConfigType = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME))

    await upsertDatabaseFromConfig(config, CIRCLE_REPOSITORY_URL)

    const [clientRepoDetails, clientCommitMessageData] = await Promise.all([
      getClientRepository(CIRCLE_REPOSITORY_URL),
      getClientCommitMessage(CIRCLE_PULL_REQUEST),
    ]);

    let clientRepoUrl = !!clientRepoDetails ? clientRepoDetails.clientRepoUrl || config.repo : config.repoUrl;
    let clientBaseBranchName = !!clientRepoDetails ? clientRepoDetails.clientBaseBranchName || config.branch : config.branch;

    const clientCommitMessage = (!!clientCommitMessageData && clientCommitMessageData.clientCommitMessage) || commitMsg || 'implementation';

    const creds = await getClientCreds(clientRepoUrl)

    if (!!creds && creds.username && (creds.token || creds.password)) {
      authorName = creds.username
      password = !!creds.token ? creds.token : creds.password
    }

    if (!clientRepoUrl.includes(`//${authorName}@`)) {
      clientRepoUrl = clientRepoUrl.replace('//', `//${authorName}@`)
    }

    const mainRepoPath = await getTempRepo(
      clientRepoUrl,
      clientBaseBranchName,
      authorName,
      password
    );

    const mainRepo = await Git.Repository.open(mainRepoPath);

    await mainRepo.checkoutBranch(clientBaseBranchName);

    const folderRepo = await Git.Repository.open(currentDir)
    const curBranchName = await getCurBranch(folderRepo)

    if ((await folderRepo.getStatus()).length) {
      throw 'Error: cannot push with uncommitted changes'
    }
    if (curBranchName === 'master') {
      throw 'Error: cannot push from master branch'
    }

    await folderRepo.checkoutBranch('master')
    const commitHash = await getLastGitSliceCommitHash(folderRepo)
    await folderRepo.checkoutBranch(curBranchName)

    await createOrPullBranch(mainRepo, branchName, commitHash)

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

    const repoStatus = await mainRepo.getStatus();

    if (!repoStatus.length) {
      await pushTempRepo(clientRepoUrl, branchName)

      return console.log(`${clientRepoUrl} already up-to-date`)
    }

    const signature = Git.Signature.now(authorName, authorEmail)
    let index = await mainRepo.refreshIndex()

    const deletedFilespath = repoStatus.filter(file => file.isDeleted()).map(file => file.path());

    for (let deletedFilePath of deletedFilespath) {
      await index.remove(deletedFilePath, 0)
    }

    const modifiedFilesPath = repoStatus.filter(file => !file.isDeleted()).map(file => file.path())
    for (let addOrModifiedFilePath of modifiedFilesPath) {
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
      clientCommitMessage,
      oid,
      [parent]
    )

    await pushTempRepo(clientRepoUrl, branchName)

    const pushedCommitSHA = (await folderRepo.getHeadCommit()).sha()
    const clientCommitSHA = (await mainRepo.getHeadCommit()).sha()

    if (!CIRCLE_PULL_REQUEST) return console.log("CIRCLE_PULL_REQUEST is required to add push commit to task")
    
    await addPushCommitInTask({
      prLink: CIRCLE_PULL_REQUEST,
      clientCommitSHA,
      slicedCommitSHA: pushedCommitSHA,
      clientRepositoryId: clientRepoDetails && clientRepoDetails.id,
    })
    
    console.log(`${clientRepoUrl} is updated`)

  } catch (e) {
    return Promise.reject(e)
  }
}

