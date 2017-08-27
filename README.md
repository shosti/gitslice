# git-folder-sync

This utility can be used to take out a foler from a repository and make it into a new repository.

# Commands
### init
```sh
$ git-folder-sync init [relative path to repo] [path to folder from root of repo] [name of new folder]
$ git-folder-sync init ./../test-repo src/frontend/public frontend-public
```
This command creates a new folder in the current directory and initiates a new git repository in it. It copies all the content in the foler `test-repo/src/frontend/public` and places it in it `frontend-public/src/frontend/public`. This command also creates a config file `frontend-public/git-folder-sync.json` to store configuration details.


### pull
```sh
$ cd frontend-public
$ git-folder-sync pull
```
If `test-repo/src/frontend/public` is updated, this command can be used to sync the updates into `frontend-public/src/frontend/public`.

### push
```sh
$ cd frontend-public
$ git-folder-sync push [commit message]
$ git-folder-sync push updated-photos
```
If `frontend-public/src/frontend/public` is updated, this command can be used to create a new branch in `test-repo` and sync the changes made in `frontend-public/src/frontend/public` to that branch. Later, a pull request can be made to merge these changes with the master branch.