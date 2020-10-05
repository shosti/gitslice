const Git = require('nodegit')
const fs = require('fs-extra')
const path = require('path')
const expect = require('expect')
const sinon = require('sinon')

const parseArgsAndExecute = require('../lib')

const {
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix,
  ensureArray,
  getLastGitSliceCommitHash
} = require('../lib/utils')

// Path to the new temporary git repository
const folderRepoRelativePath = './tmp/utils'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)
const before = require('./helpers/before')

const folderPaths = ['folder1', 'folder2'] // to be modified with the repo
let folderRepo
let mainRepo
const COMMIT_MSG_PREFIX = 'git-slice:'

beforeEach(async function() {
  this.timeout(30000)
  sinon.stub(process, 'exit')
  const { main, folder } = await before(folderRepoPath)
  mainRepo = main
  folderRepo = folder
})
afterEach(async () => {
  sinon.restore()
  await fs.remove(folderRepoPath)
})

describe('ensureArray', () => {
  it('should return an empty array if input is empty or null', () => {
    expect(ensureArray('')).toEqual([])
    expect(ensureArray(null)).toEqual([])
    expect(ensureArray(undefined)).toEqual([])
  })

  it('should convert primitive to array', () => {
    expect(ensureArray(5)).toEqual([5])
  })

  it('should convert objects to array', () => {
    const expectResult = [{ id: 1, author: 'test' }]
    expect(ensureArray({ id: 1, author: 'test' })).toEqual(expectResult)
  })
})

describe('getCurBranch', () => {
  it('should return the master branch', async () => {
    expect(await getCurBranch(folderRepo)).toBe('master')
  })

  it('should return current branch name after successful checkout', async () => {
    const testBranch = 'test-branch'
    await folderRepo.createBranch(
      testBranch,
      (await folderRepo.getMasterCommit()).sha(),
      true
    )
    await folderRepo.checkoutBranch(testBranch)
    await folderRepo.setHead(`refs/heads/${testBranch}`)
    expect(await getCurBranch(folderRepo)).toBe('test-branch')
  })
})

describe('addCommitMsgPrefix', () => {
  it('should add correct message prefix always', () => {
    const commitMessage = 'Add test files'
    expect(addCommmitMsgPrefix(commitMessage)).toBe(
      `${COMMIT_MSG_PREFIX}${commitMessage}`
    )
  })
})

describe('removeCommitMsgPrefix', () => {
  it('should remove commit message prefix', () => {
    const commitMessage = `${COMMIT_MSG_PREFIX}Add test files`
    expect(removeCommitMsgPrefix(commitMessage)).toBe('Add test files')
  })
})

describe('getAllFiles', () => {
  let allFiles
  const test1Path = path.resolve(folderRepoPath, folderPaths[0], 'test1.txt')
  const test2Path = path.resolve(folderRepoPath, folderPaths[1], 'test2.txt')

  const test1Text = 'Test 1!'
  const test2Text = 'Test 2!'

  it('should return the current files in the directory', async () => {
    allFiles = await getAllFiles(folderRepoPath)
    expect(allFiles.length).toBe(37)
  })

  it('should return all files in a directory', async () => {
    await fs.outputFile(test1Path, test1Text)
    await fs.outputFile(test2Path, test2Text)
    allFiles = await getAllFiles(folderRepoPath)
    expect(allFiles.length).toBe(39)
    expect(await fs.readFile(test1Path, 'utf8')).toBe('Test 1!')
    expect(await fs.readFile(test2Path, 'utf8')).toBe('Test 2!')
  })

  it('should return an empty array', async () => {
    await fs.remove(folderRepoPath)
    const currentDir = path.resolve(__dirname, 'tmp/test')
    fs.ensureDirSync(currentDir)
    allFiles = await getAllFiles(currentDir)
    expect(allFiles).toEqual([])
  })
})

describe('getLastGitSliceCommitHash', () => {
  it('should return last git slice commit hash', async () => {
    const expectedCommitHash = (await mainRepo.getCommit(
      await Git.Reference.nameToId(mainRepo, 'HEAD')
    )).sha()
    expect(await getLastGitSliceCommitHash(folderRepo)).toBe(expectedCommitHash)
  })
})

describe('error tests', () => {
  it('on error process should return error code 1', async () => {
    try {
      await parseArgsAndExecute(folderRepoPath + 'FOO', ['pull'])
    } catch (error) {
      expect(process.exit.calledWith(1)).toEqual(true)
    }
  })
})
