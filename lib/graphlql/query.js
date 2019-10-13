const gql = require('graphql-tag')
const { getApolloClient } = require('./index')
const { getAccessEndpointFromRepoUrl } = require('../utils')

async function getClientRepository(slicedRepoUrl) {
  const client = await getApolloClient()
  const response = await client.query({
    query: gql`
      query GetClientRepository($slicedRepoUrl: String_comparison_exp!) {
        client_repositories(where: { slicedRepoUrl: $slicedRepoUrl }) {
          id
          clientRepoUrl
          clientBaseBranchName
        }
      }
    `,
    variables: { slicedRepoUrl: { _eq: slicedRepoUrl } }
  })
  return response.data.client_repositories[0]
}

async function getClientCommitMessage(prLink) {
  const client = await getApolloClient()
  const response = await client.query({
    query: gql`
      query GetClientCommitMessage($prLink: String_comparison_exp!) {
        tasks(where: { prLink: $prLink }) {
          clientCommitMessage
        }
      }
    `,
    variables: { prLink: { _eq: prLink } }
  })
  return response.data.tasks[0]
}

async function getClientCreds(clientRepoUrl) {
  const client = await getApolloClient()
  const response = await client.query({
    query: gql`
      query GetClientCreds($accessEndpoint: String!) {
        client_bots(
          where: {
            accessEndpoint: { _eq: $accessEndpoint }
            type: { _eq: "github" }
          }
        ) {
          username
          password
        }
      }
    `,
    variables: { accessEndpoint: getAccessEndpointFromRepoUrl(clientRepoUrl) }
  })
  return response.data.client_bots[0]
}

module.exports = {
  getClientRepository,
  getClientCommitMessage,
  getClientCreds
}
