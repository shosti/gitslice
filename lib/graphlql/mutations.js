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
        update_client_repositories(
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

async function updateDatabaseFromConfig(config, slicedRepoUrl) {
  if (!config.folders || !config.ignore || !config.branch || !config.repoUrl) {
    return null
  }
  const client = await getApolloClient()
  const response = await client.mutate({
    mutation: gql`
      mutation UpdateDatabaseFromConfig(
        $slicedFolders: String!
        $ignoredPaths: String!
        $clientBaseBranchName: String!
        $clientRepoUrl: String!
        $slicedRepoUrl: String!
      ) {
        update_tasks(
          where: { slicedRepoUrl: { _eq: $slicedRepoUrl } }
          _set: {
            ignoredPaths: $ignoredPaths
            slicedFolders: $slicedFolders
            clientBaseBranchName: $clientBaseBranchName
            clientRepoUrl: $clientRepoUrl
          }
        ) {
          affected_rows
        }
      }
    `,
    variables: {
      slicedFolders: JSON.stringify(config.folders),
      ignoredPaths: JSON.stringify(config.ignore),
      clientBaseBranchName: config.branch,
      clientRepoUrl: config.repoUrl,
      slicedRepoUrl: { _eq: slicedRepoUrl }
    }
  })
  return response.data
}

// async function updateClientCreds(slicedRepoUrl, username, password, accessPoint) {
//   const client = await getApolloClient()
//   const response = await client.mutate({
//     mutation: gql`
//       mutation UpdateClientCreds(
//         $username: String!
//         $password: String!
//         $clientId: uuid!
//       ) {
//         update_tasks (
//           where: { slicedRepoUrl: { _eq: $slicedRepoUrl } }
//           _set: {
//             ignoredPaths: $ignoredPaths
//             slicedFolders: $slicedFolders
//             clientBaseBranchName: $clientBaseBranchName
//             clientRepoUrl: $clientRepoUrl
//           }
//         ) {
//           affected_rows
//         }
//       }
//     `,
//     variables: { username, password, accessPoint clientRepoUrl: config.repoUrl,
//       slicedRepoUrl: { _eq: slicedRepoUrl }
//     }
//   })
//   return response.data
// }

module.exports = {
  insertClientRepositoryCommit,
  updatePushDetailInTask,
  updateDatabaseFromConfig
}
