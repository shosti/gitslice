# git-fork

This utility can be used to take out a foler from a git repository and make it into a new git repository and eventually provide commands to sync changes between both the repositories.

# Commands
### init
```sh
$ git-fork init [relative path to repo] [path to folder from root of repo] [name of new folder]
$ git-fork init ./../test-repo src/frontend/public frontend-public
```
This command creates a new folder in the current directory and initiates a new git repository in it. It copies all the content from `test-repo/src/frontend/public` and places it in `frontend-public/src/frontend/public`. In addition, this command also creates a config file `frontend-public/git-fork.json` to store configuration details.


### pull
```sh
$ cd frontend-public
$ git-fork pull
```
If `test-repo/src/frontend/public` is updated, this command can be used to sync the updates into `frontend-public/src/frontend/public`.

### push
```sh
$ cd frontend-public
$ git-fork push [branch name] -m "[commit message]"
$ git-fork push updated-photos -m "changed public photos"
```
If `frontend-public/src/frontend/public` is updated, this command can be used to create a new branch named `updated-photos` in `test-repo` and sync the changes made in `frontend-public/src/frontend/public` to that branch. Later, a pull request can be created to merge these changes with the master branch.