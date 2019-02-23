const parseArgsAndExecute = require('../lib')

const Git = require('nodegit')
const path = require('path')
const fs = require('fs-extra')
const expect = require('expect')
const sinon = require('sinon')
const { removeCommitMsgPrefix, getCurBranch } = require('../lib/utils')
const utils = require('../lib/utils')
const folderRepoRelativePath = './tmp/push'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)

const folderPaths = ['bin', 'tests'] // to be modified with the repo
const before = require('./helpers/before')

let pushTempRepo
let mainRepoPath
let mainRepo
let folderRepo

const authorName = 'Murcul'
const authorEmail = 'murcul@murcul.com'

beforeEach(async function() {
  this.timeout(10000)
  const { main, folder } = await before(folderRepoPath)
  mainRepoPath = main
  folderRepo = folder
  mainRepo = await Git.Repository.open(mainRepoPath)
  pushTempRepo = sinon.stub(utils, 'pushTempRepo')
})
afterEach(async () => {
  await fs.remove(folderRepoPath)
})

describe('Main repo is synced properly with folder repo', function() {
  this.timeout(10000)
  it.only('properly updates if the branch already exists in the main repo', async () => {
    const branchName = 'push-test-branch-1'
    const commitMsg = 'added some files'

    await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    )
    await folderRepo.checkoutBranch(branchName)

    await mainRepo.createBranch(
      branchName,
      removeCommitMsgPrefix((await folderRepo.getMasterCommit()).message()),
      0 // gives error if the branch already exists
    )
    await mainRepo.checkoutBranch(branchName)

    const testFile1Path = path.resolve(
      folderRepoPath,
      folderPaths[0],
      'testFile1.txt'
    )

    // to placed in main repo
    const testFile2Path = path.resolve(
      mainRepoPath,
      folderPaths[0],
      'testFile4.txt'
    )

    const testFile1Text = 'Hello World!'
    const testFile2Text = 'This file in main repo should be deleted'

    await fs.outputFile(testFile1Path, testFile1Text)
    await fs.outputFile(testFile2Path, testFile2Text)
    const signature = mainRepo.defaultSignature()

    // commit textFile4 in main repo
    const mainRepoIndex = await mainRepo.refreshIndex()
    await mainRepoIndex.addByPath(path.relative(mainRepoPath, testFile2Path))
    await mainRepoIndex.write()
    const mainRepoOid = await mainRepoIndex.writeTree()
    const mainRepoParent = await mainRepo.getCommit(
      await Git.Reference.nameToId(mainRepo, 'HEAD')
    )
    await mainRepo.createCommit(
      'HEAD',
      signature,
      signature,
      'adding a test file',
      mainRepoOid,
      [mainRepoParent]
    )

    const folderRepoIndex = await folderRepo.refreshIndex()
    await folderRepoIndex.addByPath(
      path.relative(folderRepoPath, testFile1Path)
    )
    await folderRepoIndex.write()
    const oid = await folderRepoIndex.writeTree()
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    )
    await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      commitMsg,
      oid,
      [parent]
    )
    const pushCmd = `push --branch ${branchName} --message ${commitMsg} --author-name ${authorName} --author-email ${authorEmail}`
    await parseArgsAndExecute(folderRepoPath, pushCmd.split(' '))
    pushTempRepo.restore()

    expect(
      await fs.readFile(
        testFile1Path.replace(folderRepoPath, mainRepoPath),
        'utf8'
      )
    ).toBe(testFile1Text)
    expect(await fs.exists(testFile2Path)).toBe(false)
  })

  it('does not push if master branch is checked out', async () => {
    expect.assertions(2)
    await folderRepo.checkoutBranch('master')
    await folderRepo.setHead(`refs/heads/master`)

    const branchName = 'test-branch-5'
    const commitMsg = 'random commit for testing'
    const pushCmd = `push --branch ${branchName} --message ${commitMsg} --author-name ${authorName} --author-email ${authorEmail}`
    try {
      await parseArgsAndExecute(folderRepoPath, pushCmd.split(' '))
    } catch (e) {
      expect(pushTempRepo).not.toHaveBeenCalled()
      pushTempRepo.restore()
      expect(e).toBe('Error: cannot push from master branch')
    }
  })

  it('does not push if there are uncommitted changes', async () => {
    expect.assertions(2)
    const branchName = 'test-branch-4'
    const folderBranchName = 'noPush'
    const commitMsg = 'made some unimportant changes'

    const newBranch = await folderRepo.createBranch(
      folderBranchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    )
    await folderRepo.checkoutBranch(folderBranchName)
    const testFile1Path = path.resolve(
      folderRepoPath,
      folderPaths[0],
      'testFile1.txt'
    )
    const testFile1Text = 'Some unimportant text'
    await fs.outputFile(testFile1Path, testFile1Text)

    try {
      const pushCmd = `push --branch ${branchName} --message ${commitMsg} --author-name ${authorName} --author-email ${authorEmail}`
      await parseArgsAndExecute(folderRepoPath, pushCmd.split(' '))
    } catch (e) {
      expect(e).toBe('Error: cannot push with uncommitted changes')
      expect(pushTempRepo).not.toHaveBeenCalled()
      pushTempRepo.restore()
    }
  })

  it('commits with the correct signature in the main repo', async () => {
    const branchName = 'test-branch-6'
    const commitMsg = 'added-some-files'

    const newBranch = await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    )
    await folderRepo.checkoutBranch(branchName)

    const testFile1Path = path.resolve(
      folderRepoPath,
      folderPaths[0],
      'testFile1.txt'
    )

    const testFile1Text = 'Hello World!'
    await fs.outputFile(testFile1Path, testFile1Text)
    const signature = mainRepo.defaultSignature()

    let index = await folderRepo.refreshIndex()
    await index.addByPath(path.relative(folderRepoPath, testFile1Path))
    await index.write()
    const oid = await index.writeTree()
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    )
    const addedFiles = await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      commitMsg,
      oid,
      [parent]
    )
    const pushCmd = `push --branch ${branchName} --message ${commitMsg} --author-name ${authorName} --author-email ${authorEmail}`
    await parseArgsAndExecute(folderRepoPath, pushCmd.split(' '))
    expect(pushTempRepo).toHaveBeenCalledTimes(1)
    pushTempRepo.restore()
    const commitAuthor = (await mainRepo.getHeadCommit()).author().toString()
    expect(commitAuthor).toEqual(`${authorName} <${authorEmail}>`)
  })

  it('pushes with correct branch name and commit message', async () => {
    const branchName = 'test-branch-7'
    const commitMsg = 'added-some-files'

    const newBranch = await folderRepo.createBranch(
      branchName,
      (await folderRepo.getMasterCommit()).sha(),
      0 // gives error if the branch already exists
    )
    await folderRepo.checkoutBranch(branchName)

    const testFile1Path = path.resolve(
      folderRepoPath,
      folderPaths[0],
      'testFile1.txt'
    )

    const testFile1Text = "Hello World! How's everything going?"
    await fs.outputFile(testFile1Path, testFile1Text)
    const signature = mainRepo.defaultSignature()

    let index = await folderRepo.refreshIndex()
    await index.addByPath(path.relative(folderRepoPath, testFile1Path))
    await index.write()
    const oid = await index.writeTree()
    const parent = await folderRepo.getCommit(
      await Git.Reference.nameToId(folderRepo, 'HEAD')
    )
    const addedFiles = await folderRepo.createCommit(
      'HEAD',
      signature,
      signature,
      commitMsg,
      oid,
      [parent]
    )
    const pushCmd = `push --branch ${branchName} --message ${commitMsg} --author-name ${authorName} --author-email ${authorEmail}`
    await parseArgsAndExecute(folderRepoPath, pushCmd.split(' '))
    expect(pushTempRepo).toHaveBeenCalledTimes(1)
    pushTempRepo.restore()
    expect(await getCurBranch(mainRepo)).toEqual(branchName)
    expect((await mainRepo.getHeadCommit()).message()).toEqual(commitMsg)
  })
})
