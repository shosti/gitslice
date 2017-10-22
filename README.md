# git-slice
[![npm version](https://badge.fury.io/js/git-slice.svg)](https://badge.fury.io/js/git-slice) [![npm](https://img.shields.io/npm/dt/git-slice.svg)](https://www.npmjs.com/package/git-slice)

This utility can be used to take out foler from a git repository, fork it into a new git repository and eventually provide commands to sync changes between both the repositories.

## Commands
### init
```sh
$ git-slice init [relative path to repo] [first/folder/path/from/root] [second/folder/path/from/root] [name of new folder]
$ git-slice init ./../main-repo src/frontend/public src/frontend/Components/Login frontend-public
```
This command creates a new folder in the current directory and initiates a new git repository in it. It copies all the content from `main-repo/src/frontend/public` and `main-repo/src/frontend/Components/Login`, and places it in `frontend-public/src/frontend/public` and `frontend-public/src/frontend/Components/Login` respectively. In addition, this command also creates a config file `frontend-public/git-slice.json` to store configuration details.
Before running this command please make sure that the main repository is checked out to master branch.


### pull
```sh
$ cd frontend-public
$ git-slice pull
```
If `main-repo/src/frontend/public` is updated, this command can be used to sync the updates into `frontend-public/src/frontend/public`.
Before running this command please make sure that both main repository and the forked folder repository is checked out to master branch.

### push
```sh
$ cd frontend-public
$ git-slice push [branch name] -m "[commit message]"
$ git-slice push updated-photos -m "changed public photos"
```
If `frontend-public/src/frontend/public` is updated, this command can be used to create a new branch named `updated-photos` in `main-repo` and sync the changes made in `frontend-public/src/frontend/public` to that branch. Later, a pull request can be created to merge these changes with the master branch.
Before running this command please make sure that the main repository is checked out to master branch.
