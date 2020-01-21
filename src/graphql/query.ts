import gql from 'graphql-tag'

import { runQuery } from './index'
import { getAccessEndpointFromRepoUrl } from '@lib/utils'
import {
  GetClientRepositoryVariables,
  GetClientRepository_client_repositories,
  GetClientRepository,
} from './generated/GetClientRepository'
import {
  GetClientCommitMessageVariables,
  GetClientCommitMessage,
  GetClientCommitMessage_tasks,
} from './generated/GetClientCommitMessage'
import {
  GetClientCredsVariables,
  GetClientCreds,
  GetClientCreds_client_bots,
} from './generated/GetClientCreds'

export const GET_CLIENT_REPOSITORY = gql`
  query GetClientRepository($slicedRepoUrl: String!) {
    client_repositories(where: { slicedRepoUrl: { _eq: $slicedRepoUrl } }) {
      id
      clientRepoUrl
      clientBaseBranchName
    }
  }
`

export const GET_CLIENT_COMMIT_MESSAGE = gql`
  query GetClientCommitMessage($prLink: String!) {
    tasks(where: { prLink: { _eq: $prLink } }) {
      clientCommitMessage
    }
  }
`

export const GET_CLIENT_CREDS = gql`
  query GetClientCreds($accessEndpoint: String!) {
    client_bots(
      where: {
        accessEndpoint: { _eq: $accessEndpoint }
        type: { _eq: "github" }
      }
    ) {
      username
      password
      token
    }
  }
`

export const getClientRepository = async (
  slicedRepoUrl: string
): Promise<GetClientRepository_client_repositories> => {
  const { client_repositories } = await runQuery<
    GetClientRepository,
    GetClientRepositoryVariables
  >({
    query: GET_CLIENT_REPOSITORY,
    variables: {
      slicedRepoUrl,
    },
  })

  return client_repositories[0]
}

export const getClientCommitMessage = async (
  prLink: string
): Promise<GetClientCommitMessage_tasks> => {
  const { tasks } = await runQuery<
    GetClientCommitMessage,
    GetClientCommitMessageVariables
  >({
    query: GET_CLIENT_COMMIT_MESSAGE,
    variables: {
      prLink,
    },
  })

  return tasks[0]
}

export const getClientCreds = async (
  clientRepoUrl: string
): Promise<GetClientCreds_client_bots> => {
  const { client_bots } = await runQuery<
    GetClientCreds,
    GetClientCredsVariables
  >({
    query: GET_CLIENT_CREDS,
    variables: {
      accessEndpoint: getAccessEndpointFromRepoUrl(clientRepoUrl),
    },
  })

  return client_bots[0]
}
