import gql from 'graphql-tag'

import { runMutation } from './index'
import { getClientName, canUpsertDatabaseFromConfig } from '../lib/utils'
import {
  InsertClientRepositoryCommitVariables,
  InsertClientRepositoryCommit,
} from './generated/InsertClientRepositoryCommit'
import {
  addPushCommitInTaskVariables,
  addPushCommitInTask as addPushCommitInTaskType,
} from './generated/addPushCommitInTask'
import {
  UpsertDatabaseFromConfigVariables,
  UpsertDatabaseFromConfig,
} from './generated/UpsertDatabaseFromConfig'
import { GitSliceConfigType } from '../types/graphql'

export const INSERT_CLIENT_REPOSITORY_COMMIT = gql`
  mutation InsertClientRepositoryCommit(
    $clientRepositoryId: uuid!
    $clientBaseCommitSHA: String!
    $slicedCommitSHA: String!
  ) {
    insert_client_repositories_commits(
      objects: {
        clientBaseCommitDate: "now()"
        clientBaseCommitSHA: $clientBaseCommitSHA
        slicedCommitDate: "now()"
        slicedCommitSHA: $slicedCommitSHA
        clientRepositoryId: $clientRepositoryId
      }
    ) {
      returning {
        id
      }
    }
  }
`

export const UPSERT_DATABASE_FROM_CONFIG = gql`
  mutation UpsertDatabaseFromConfig(
    $slicedFolders: String!
    $ignoredPaths: String!
    $clientBaseBranchName: String!
    $clientRepoUrl: String!
    $slicedRepoUrl: String!
    $clientId: String!
  ) {
    insert_client_repositories(
      objects: {
        ignoredPaths: $ignoredPaths
        slicedFolders: $slicedFolders
        clientBaseBranchName: $clientBaseBranchName
        clientRepoUrl: $clientRepoUrl
        slicedRepoUrl: $slicedRepoUrl
        clientId: $clientId
      }
      on_conflict: {
        constraint: UQ_SLICED_REPO
        update_columns: [
          ignoredPaths
          slicedFolders
          clientBaseBranchName
          clientRepoUrl
          clientId
        ]
      }
    ) {
      affected_rows
    }
  }
`

export const ADD_PUSH_COMMIT_IN_TASK = gql`
  mutation addPushCommitInTask(
    $clientCommitSHA: String!
    $slicedCommitSHA: String!
    $clientRepositoryId: uuid!
    $prLink: String!
  ) {
    insert_client_repositories_commits(
      objects: {
        clientCommitSHA: $clientCommitSHA
        clientCommitDate: "now()"
        slicedCommitSHA: $slicedCommitSHA
        slicedCommitDate: "now()"
        clientRepositoryId: $clientRepositoryId
      }
    ) {
      affected_rows
    }
  }
`

export const insertClientRepositoryCommit = async (
  variables: InsertClientRepositoryCommitVariables
): Promise<InsertClientRepositoryCommit> => {
  const data = await runMutation<
    InsertClientRepositoryCommit,
    InsertClientRepositoryCommitVariables
  >({
    mutation: INSERT_CLIENT_REPOSITORY_COMMIT,
    variables,
  })

  return data
}

export const addPushCommitInTask = async (
  variables: addPushCommitInTaskVariables
): Promise<addPushCommitInTaskType> => {
  const data = await runMutation<
    addPushCommitInTaskType,
    addPushCommitInTaskVariables
  >({
    mutation: ADD_PUSH_COMMIT_IN_TASK,
    variables,
  })

  return data
}

export const upsertDatabaseFromConfig = async (
  config: GitSliceConfigType,
  slicedRepoUrl?: string
): Promise<UpsertDatabaseFromConfig | void> => {

  if (!slicedRepoUrl) return console.log("slicedRepoUrl is required")
  if (!canUpsertDatabaseFromConfig(config, slicedRepoUrl)) return

  const data = await runMutation<
    UpsertDatabaseFromConfig,
    UpsertDatabaseFromConfigVariables
  >({
    mutation: UPSERT_DATABASE_FROM_CONFIG,
    variables: {
      slicedFolders: config.folders.join(','),
      ignoredPaths: config.ignore.join(','),
      clientBaseBranchName: config.branch,
      clientRepoUrl: config.repoUrl.replace(/\/\/.*@/gm, '//'),
      slicedRepoUrl,
      clientId: await getClientName(slicedRepoUrl.split('/').reverse()[0]),
    },
  })

  return data
}
