# git-slice
[![npm version](https://badge.fury.io/js/git-slice.svg)](https://badge.fury.io/js/git-slice) [![npm](https://img.shields.io/npm/dt/git-slice.svg)](https://www.npmjs.com/package/git-slice)

## Please be aware that one of git-slice dependencies `nodegit` doesnot properly work with `Node 9.x`, therefore until this problem is resolved we recommend that you to use `Node 8.x` instead.

This utility can be used to take out foler from a git repository, fork it into a new git repository and eventually provide commands to sync changes between both the repositories.

## Commands
### git-slice init

#### Optiions
 Option        | Input          | Required | Allow Multiple |
| :-------------: |:-------------:|:-----:|:--------:|
| --repo | Relative path of the git repository to be sliced | YES | NO |
| --branch | Name of the repository branch to be sliced | YES | NO |
| --folder |  Path of the folder from the repository root | YES | YES |


```sh
$ git-slice init frontent-public --repo ./../main-repo --folder src/frontend/public --folder src/frontend/Components/Login --branch develop
```  

This command creates a new folder in the current directory and initiates a new git repository in it. In this case it will copy all the content from `main-repo/src/frontend/public` and `main-repo/src/frontend/Components/Login`, and places it in `frontend-public/src/frontend/public` and `frontend-public/src/frontend/Components/Login` respectively. In addition, this command also creates a config file `frontend-public/git-slice.json` to store configuration details.


### git-slice pull
```sh
$ cd frontend-public
$ git-slice pull
```

If `main-repo/src/frontend/public` is updated, this command can be used to sync the updates into `frontend-public/src/frontend/public`.


### git-slice push
```sh
$ cd frontend-public
$ git-slice push --branch updated-photos -message "changed public photos"
```

#### Options
 Option        | Input          | Required
| :-------------: |:-------------:|:-----:|
| --branch | Name of the branch to be created in the main git repository while pushing | YES |
| --message |  Commit mesasge used to commit changes in the main git reposirory | YES |


If `frontend-public/src/frontend/public` is updated, this command can be used to create a new branch named `updated-photos` in `main-repo` and sync the changes made in `frontend-public/src/frontend/public` to that branch. Later, a pull request can be created to merge these changes with the master branch.