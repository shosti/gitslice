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

async function updatePushDetailInTask(variables) {
  const client = await getApolloClient()
  const response = await client.mutate({
    mutation: gql`
      mutation UpdatePushDetailInTask(
        $clientCommitSHA: String!
        $pushedCommitSHA: String!
        $prLink: String!
      ) {
        update_tasks(
          where: { prLink: { _eq: $prLink } }
          _set: {
            clientCommitSHA: $clientCommitSHA
            clientCommitDate: "now()"
            pushedCommitSHA: $pushedCommitSHA
            pushedCommitDate: "now()"
          }
        ) {
          affected_rows
        }
      }
    `,
    variables
  })
  return response.data
}

module.exports = {
  insertClientRepositoryCommit,
  updatePushDetailInTask
}
