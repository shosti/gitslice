const gql = require('graphql-tag')
const { getApolloClient } = require('./index')

async function insertClientRepositoryCommit(variables) {
  const client = await getApolloClient()
  const response = await client.mutate({
    mutation: gql`
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
    `,
    variables
  })
  return response.data
}

module.exports = {
  insertClientRepositoryCommit
}
