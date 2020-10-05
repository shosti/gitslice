const fs = require('fs-extra')
const path = require('path')
const { getTempRepoPath } = require('../../lib/utils')

const repoToClone = 'https://github.com/murcul/git-slice.git'

// This hook doesn't work anymore!!!
after(async function() {
  console.log('test/helpers/teardown.js')
  const mainRepoPath = getTempRepoPath(repoToClone)
  const setupFolder = path.join(__dirname, '..', 'tmp/setup')

  await fs.remove(mainRepoPath)
  await fs.remove(setupFolder)
})
