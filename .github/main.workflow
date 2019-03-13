workflow "build-and-test" {
  on = "push"
  resolves = "test-coverage"
}

action "test-coverage" {
  uses = "action/npm@master"
  args = "coverage"
  needs = ["test"]
}

action "build" {
  uses = "docker://node:11.6.0"
  args = "npm install"
}

action "test" {
  uses = "docker://node:11.6.0"
  args = "npm test"
  needs = ["build"]
}