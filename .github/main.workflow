workflow "build-and-test" {
  on = "push"
  resolves = "test"
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