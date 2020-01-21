const expect = require('expect')
const fs = require('fs-extra')
const path = require('path')
const sinon = require('sinon')
const parseArgsAndExecute = require('../lib')
const { CONFIG_FILENAME } = require('../lib/constants')
const before = require('./helpers/before')
sinon.stub(process, 'exit')

const folderRepoRelativePath = './tmp/ignore'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)

let folderRepo

beforeEach(async function() {
  this.timeout(10000)
  const { folder } = await before(folderRepoPath)
  folderRepo = folder
})
afterEach(async () => {
  await fs.remove(folderRepoPath)
})

describe('Modifies ignore array in config file', () => {
  it('correctly detects same file in for both operations', async () => {
    expect.assertions(2)
    const initialConfig = await fs.readJson(
      path.resolve(folderRepoPath, CONFIG_FILENAME)
    )
    try {
      const ignoreCmd = `ignore --add test-file-1.txt --remove test-file-1.txt`
      await parseArgsAndExecute(folderRepoPath, ignoreCmd.split(' '))
    } catch (e) {
      const updatedConfig = await fs.readJson(
        path.resolve(folderRepoPath, CONFIG_FILENAME)
      )
      expect(e).toBe(
        'Error: Both add and remove operation is being performed on the same file'
      )
      expect(process.exit.calledWith(1)).toEqual(true)

      expect(initialConfig).toEqual(updatedConfig) // no changes are made to the config file
    }
  })

  it('correctly performes the add operation', async () => {
    const intialIgnore = (await fs.readJson(
      path.resolve(folderRepoPath, CONFIG_FILENAME)
    )).ignore
    const fileToAdd = 'test-file-3.txt'
    const ignoreCmd = `ignore --add ${fileToAdd}`
    await parseArgsAndExecute(folderRepoPath, ignoreCmd.split(' '))
    const updatedIgnore = (await fs.readJson(
      path.resolve(folderRepoPath, CONFIG_FILENAME)
    )).ignore
    const actualCommitMsg = (await folderRepo.getMasterCommit()).message()
    expect([...intialIgnore, fileToAdd]).toEqual(updatedIgnore)
    expect(actualCommitMsg).toEqual(`updated ${CONFIG_FILENAME}`)
  })

  it('correctly performes the remove operation', async () => {
    const fileToUse = 'test-file-3.txt'
    const ignoreAddCmd = `ignore --add ${fileToUse}`
    await parseArgsAndExecute(folderRepoPath, ignoreAddCmd.split(' '))

    const intialIgnore = (await fs.readJson(
      path.resolve(folderRepoPath, CONFIG_FILENAME)
    )).ignore
    const ignoreRemoveCmd = `ignore --remove ${fileToUse}`
    await parseArgsAndExecute(folderRepoPath, ignoreRemoveCmd.split(' '))
    const updatedIgnore = (await fs.readJson(
      path.resolve(folderRepoPath, CONFIG_FILENAME)
    )).ignore
    const actualCommitMsg = (await folderRepo.getMasterCommit()).message()
    expect(intialIgnore).toEqual([...updatedIgnore, fileToUse])
    expect(actualCommitMsg).toEqual(`updated ${CONFIG_FILENAME}`)
  })
})
