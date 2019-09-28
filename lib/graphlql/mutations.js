const gql = require('graphql-tag')
const { getApolloClient } = require('./index')

async function insertClientRepository(variables) {
  const client = await getApolloClient()
  const response = await client.mutate({
    mutation: gql`
      mutation InsertClientRepository(
        $clientId: String!
        $clientBaseCommitSHA: String!
        $slicedCommitSHA: String!
        $slicedRepoUrl: String!
        $clientRepoUrl: String!
        $clientBaseBranchName: String!
        $botType: String!
      ) {
        insert_client_repositories(
          objects: {
            clientId: $clientId
            clientBaseCommitDate: "now()"
            clientBaseCommitSHA: $clientBaseCommitSHA
            slicedCommitDate: "now()"
            slicedCommitSHA: $slicedCommitSHA
            slicedRepoUrl: $slicedRepoUrl
            clientRepoUrl: $clientRepoUrl
            clientBaseBranchName: $clientBaseBranchName
            botType: $botType
          }
        ) {
          returning {
            id
          }
        }
      }
    `,
    variables
  })
  return response.data
}

module.exports = {
  insertClientRepository
}
