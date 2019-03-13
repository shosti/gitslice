workflow "build-and-test" {
  on = "push"
  resolves = "test-coverage"
}

action "test-coverage" {
  uses = "actions/npm@master"
  args = "run coverage"
  needs = ["test"]
  secrets = ["CODECOV_TOKEN"]
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