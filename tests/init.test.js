const { CONFIG_FILENAME } = require('../lib/constants')
const { addCommmitMsgPrefix } = require('../lib/utils')
const Git = require('nodegit')
const path = require('path')
const fs = require('fs-extra')

const folderRepoRelativePath = './tmp/init'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)
const before = require('./helpers/before')

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join('|^'))
const branchName = 'master'

let mainRepoPath
let mainRepo
let folderRepo
beforeEach(async done => {
  jest.setTimeout(10000)
  const { main, folder } = await before(folderRepoRelativePath, folderRepoPath)
  mainRepoPath = main
  folderRepo = folder
  mainRepo = await Git.Repository.open(mainRepoPath)
  done()
})
afterEach(async done => {
  await fs.remove(folderRepoPath)
  done()
})

describe('Folder repo is forked correcly', () => {
  test('all unignored files are copied - check by counting', async () => {
    const filesToCopy = (await mainRepo.index())
      .entries()
      .filter(x => folderPathRegExp.test(x.path))
    const copiedFiles = (await folderRepo.index())
      .entries()
      .filter(x => x.path !== '.gitignore')
    // excluding the config file
    expect(copiedFiles.length - 1).toBe(filesToCopy.length)
  })
  test('all unignored files are copied - check by name and file size', async () => {
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
  test('proper commit is made in the forked folder', async () => {
    const expected = addCommmitMsgPrefix(
      (await mainRepo.getMasterCommit()).sha()
    )
    const output = (await folderRepo.getMasterCommit()).message()
    expect(output).toBe(expected)
    await fs.remove(folderRepoPath)
  })
  test('config file is created correctly', async () => {
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
