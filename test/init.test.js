const path = require('path')
const fs = require('fs-extra')
const expect = require('expect')

const { CONFIG_FILENAME } = require('../lib/constants')
const { addCommmitMsgPrefix } = require('../lib/utils')
const before = require('./helpers/before')

const folderRepoRelativePath = './tmp/init'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join('|^'))
const branchName = 'master'

let mainRepo
let folderRepo
beforeEach(async function() {
  this.timeout(30000)
  const { main, folder } = await before(folderRepoPath)
  mainRepo = main
  folderRepo = folder
})
afterEach(async () => {
  await fs.remove(folderRepoPath)
})

describe('Folder repo is forked correcly', () => {
  it('all unignored files are copied - check by counting', async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path))
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== '.gitignore')
    // excluding the config file
    expect(copiedFiles.length - 1).toBe(filesToCopy.length)
  })
  it('all unignored files are copied - check by name and file size', async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path))
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== '.gitignore')
      .filter(x => x.path !== CONFIG_FILENAME)
    expect(
      copiedFiles.map(({ fileSize, path }) => ({ fileSize, path }))
    ).toEqual(filesToCopy.map(({ fileSize, path }) => ({ fileSize, path })))
  })
  it('proper commit is made in the forked folder', async () => {
    const expected = addCommmitMsgPrefix(
      (await mainRepo.getMasterCommit()).sha()
    )
    const output = (await folderRepo.getMasterCommit()).message()
    expect(output).toBe(expected)
    await fs.remove(folderRepoPath)
  })
  it('config file is created correctly', async () => {
    const expected = {
      repoUrl: repoToClone,
      folders: folderPaths,
      branch: branchName,
      ignore: [CONFIG_FILENAME]
    }
    expect(
      await fs.readJson(path.resolve(folderRepoPath, CONFIG_FILENAME))
    ).toEqual(expected)
  })
})
