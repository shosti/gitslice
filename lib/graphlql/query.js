const gql = require('graphql-tag')
const { getApolloClient } = require('./index')

async function getClientRepository(slicedRepoUrl) {
  try {
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
  } catch (e) {
    console.log(e)
    return
  }
}

async function getClientCommitMessage(sourceURL) {
  try {
    const client = await getApolloClient()
    const { data: { tasks } } = await client.query({
      query: gql`
        query GetClientCommitMessage($sourceURL: String_comparison_exp!) {
          task_pull_requests(
            where:{
              git_pull_request:{
                github_pull_request:{
                  syncable_entity:{
                    sourceUrl: $sourceURL
                  }
                }
              }
            }
          ){
            task{
              clientCommitMessage
            }
          }
        }
      `,
      variables: { sourceURL: { _eq: sourceURL } }
    })

    return tasks[0]
  } catch (e) {
    console.log(e)
    return
  }
}

async function getClientCreds(clientRepoUrl) {
  try {
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
            token
          }
        }
      `,
      variables: { accessEndpoint: getAccessEndpointFromRepoUrl(clientRepoUrl) }
    })
    return response.data.client_bots[0]
  } catch (e) {
    console.log(e)
    return
  }
}

function getAccessEndpointFromRepoUrl(repoUrl) {
  repoUrl = repoUrl.replace(/\/\/.*@/gm, '//')
  return repoUrl.substr(0, repoUrl.lastIndexOf('/'))
}

module.exports = {
  getClientRepository,
  getClientCommitMessage,
  getClientCreds
}
