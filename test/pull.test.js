const path = require('path')
const fs = require('fs-extra')
const expect = require('expect')

const parseArgsAndExecute = require('../lib')
const { CONFIG_FILENAME, DEFAULT_BRANCH } = require('../lib/constants')
const { getCurBranch, addCommmitMsgPrefix } = require('../lib/utils')
const before = require('./helpers/before')

const folderRepoRelativePath = './tmp/pull'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)

const folderPaths = ['lib', 'bin'] // to be modified with the repo
const folderPathRegExp = new RegExp(folderPaths.join('|^'))

let mainRepo
let folderRepo

beforeEach(async function() {
  this.timeout(10000)
  const { main, folder } = await before(folderRepoPath)
  mainRepo = main
  folderRepo = folder
})
afterEach(async () => {
  await fs.remove(folderRepoPath)
})

describe('Folder repo is synced properly with main repo', () => {
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

  it('checkouts to the default branch before pulling', async () => {
    let branchName = 'pull-test-branch'
    await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    )
    await folderRepo.checkoutBranch(branchName)
    await folderRepo.setHead(`refs/heads/${branchName}`)
    await parseArgsAndExecute(folderRepoPath, ['pull'])
    expect(await getCurBranch(folderRepo)).toBe(DEFAULT_BRANCH)
  })

  it('does not pull if there are uncommitted changes', async () => {
    expect.assertions(1)
    const testFilePath = path.resolve(
      folderRepoPath,
      folderPaths[0],
      'testFile1.txt'
    )
    const testFileText = 'Some unimportant text'
    await fs.outputFile(testFilePath, testFileText)
    try {
      await parseArgsAndExecute(folderRepoPath, ['pull'])
    } catch (e) {
      expect(e).toBe('Error: cannot pull with uncommitted changes')
    }
  })
})
