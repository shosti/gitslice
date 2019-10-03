require('dotenv').config()
const gql = require('graphql-tag')
const { getApolloClient } = require('./index')

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

module.exports = {
  getClientRepository
}
