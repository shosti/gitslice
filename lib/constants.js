const CONFIG_FILENAME = 'git-slice.json'

const INVALID_ARG_MSG =
  'Invalid arguments, following are the usage details of this command:'

const DEFAULT_BRANCH = process.env.GIT_SLICE_DEFAULT_BRANCH || 'master'

module.exports = {
  CONFIG_FILENAME,
  INVALID_ARG_MSG,
  DEFAULT_BRANCH
}
