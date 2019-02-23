const fs = require('fs-extra')
const path = require('path')
const parseArgsAndExecute = require('../../lib')
const { getTempRepoPath } = require('../../lib/utils')

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['bin', 'tests'] // to be modified with the repo
const branchName = 'master'

before(async function() {
  this.timeout(20000)
  const mainRepoPath = getTempRepoPath(repoToClone)
  const setupFolder = path.join(__dirname, '..', 'setup')
  if (fs.existsSync(mainRepoPath)) await fs.remove(mainRepoPath)
  if (fs.existsSync(setupFolder)) await fs.remove(setupFolder)

  const initCmd = `init ${setupFolder} --repo ${repoToClone} --folder ${
    folderPaths[0]
  } --folder ${folderPaths[1]} --branch ${branchName}`
  await parseArgsAndExecute(__dirname, initCmd.split(' '))
})
