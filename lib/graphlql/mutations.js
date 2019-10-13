const gql = require('graphql-tag')
const { getApolloClient } = require('./index')

async function insertClientRepositoryCommit(variables) {
  try {
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
  } catch (e) {
    console.log(e)
    return
  }
}

async function updatePushDetailInTask(variables) {
  try {
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
  } catch (e) {
    console.log(e)
    return
  }
}

async function updateDatabaseFromConfig(config, slicedRepoUrl) {
  if (!config.folders || !config.ignore || !config.branch || !config.repoUrl) {
    console.log(
      'Config does not have all the fields so unable to save config to the database!'
    )
    return null
  }
  try {
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
          update_client_repositories(
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
        slicedFolders: config.folders.join(','),
        ignoredPaths: config.ignore.join(','),
        clientBaseBranchName: config.branch,
        clientRepoUrl: config.repoUrl,
        slicedRepoUrl
      }
    })
    return response.data
  } catch (e) {
    console.log(e)
    return
  }
}

module.exports = {
  insertClientRepositoryCommit,
  updatePushDetailInTask,
  updateDatabaseFromConfig
}
