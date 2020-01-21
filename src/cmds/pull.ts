import Git from 'nodegit';
import path from 'path';
import fs from 'fs-extra';

import { addCommmitMsgPrefix, getTempRepo, copyFiles, deleteFiles, findFile } from '@lib/utils';
import { CONFIG_FILENAME } from '@lib/constants';
import {  insertClientRepositoryCommit, upsertDatabaseFromConfig } from '@graphql/mutations';
import { getClientRepository, getClientCreds } from '@graphql/query';
import { GitSliceConfigType } from '@customTypes/graphql';

const { CIRCLE_REPOSITORY_URL } = process.env;

export default async (currentDir: string, username: string, password: string) => {
  try {
    const config: GitSliceConfigType = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME));

    await upsertDatabaseFromConfig(config, CIRCLE_REPOSITORY_URL);
    
    const clientRepoDetails = await getClientRepository(CIRCLE_REPOSITORY_URL);

    let clientRepoUrl = !!clientRepoDetails ? clientRepoDetails.clientRepoUrl || config.repo : config.repoUrl;
    let clientBaseBranchName = !!clientRepoDetails ? clientRepoDetails.clientBaseBranchName || config.branch : config.branch;
    
    const creds = await getClientCreds(clientRepoUrl);

    if (!!creds && creds.username && (creds.token || creds.password)) {
      username = creds.username;
      password = !!creds.token ? creds.token : creds.password;
    }

    if (!clientRepoUrl.includes(`//${username}@`)) {
      clientRepoUrl = clientRepoUrl.replace('//', `//${username}@`);
    }

    const mainRepoPath = await getTempRepo(
      clientRepoUrl,
      clientBaseBranchName,
      username,
      password
    );

    const mainRepo = await Git.Repository.open(mainRepoPath);
    await mainRepo.checkoutBranch(clientBaseBranchName);

    const folderRepo = await Git.Repository.open(currentDir);
    if ((await folderRepo.getStatus()).length) {
      throw 'Error: cannot pull with uncommitted changes';
    }

    await folderRepo.checkoutBranch('master');
    await folderRepo.setHead(`refs/heads/master`);

    await deleteFiles(currentDir, config.ignore);
    await copyFiles(mainRepoPath, currentDir, config.folders, config.ignore);

    const repoStatus = await folderRepo.getStatus();

    if (!repoStatus.length) return console.log(`This repo already up-to-date`);

    const signature = folderRepo.defaultSignature();
    let index = await folderRepo.refreshIndex();
    const deletedFilesPath = repoStatus.filter(file => file.isDeleted()).map(file => file.path());

    for (let deletedFilePath of deletedFilesPath) {
      await index.remove(deletedFilePath, 0);
    }

    const addedOrModifiedFilesPath = repoStatus.filter(file => !file.isDeleted()).map(file => file.path());

    for (let addOrModifiedFilePath of addedOrModifiedFilesPath) {
      await index.addByPath(addOrModifiedFilePath);
    }

    const keepFiles = findFile(currentDir, '.keep');
    for (let file of keepFiles)
      await index.addByPath(path.relative(currentDir, file));

    await index.write();
    const oid = await index.writeTree();

    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    );

    const clientBaseCommitSHA = (await mainRepo.getHeadCommit()).sha();

    await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      addCommmitMsgPrefix(clientBaseCommitSHA),
      oid,
      [parent]
    );
    console.log(`This repo is updated successfully`);

    const slicedCommitSHA = (await folderRepo.getHeadCommit()).sha();

    if (!!clientRepoDetails && clientRepoDetails.id) {
      await insertClientRepositoryCommit({
        clientBaseCommitSHA,
        slicedCommitSHA,
        clientRepositoryId: clientRepoDetails.id
      });
    }
  } catch (e) {
    return Promise.reject(e)
  }
}
