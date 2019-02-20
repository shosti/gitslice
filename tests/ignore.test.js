const Git = require('nodegit')
const fs = require('fs-extra')
const path = require('path')
const parseArgsAndExecute = require('../lib')
const _ = require('lodash')
const { CONFIG_FILENAME } = require('../lib/constants')
const { getTempRepoPath } = require('../lib/utils')

const folderRepoRelativePath = './tmp/ignore'
const folderRepoPath = path.resolve(__dirname, folderRepoRelativePath)

const repoToClone = 'https://github.com/murcul/git-slice.git'
const folderPaths = ['lib', 'bin'] // to be modified with the repo
const branchName = 'master'

let folderRepo
let mainRepoPath

beforeEach(async done => {
  if (mainRepoPath) {
    await fs.remove(mainRepoPath)
  }
  jest.setTimeout(10000)
  mainRepoPath = getTempRepoPath('ignore')
  const initCmd = `init ${folderRepoRelativePath} --repo ${repoToClone} --folder ${
    folderPaths[0]
  } --folder ${folderPaths[1]} --branch ${branchName}`

  await parseArgsAndExecute(__dirname, initCmd.split(' '))
  folderRepo = await Git.Repository.open(folderRepoPath)
  done()
})
afterEach(async done => {
  await fs.remove(folderRepoPath)
  await fs.remove(mainRepoPath)
  done()
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
