#!/usr/bin/env node
const parseArgsAndExecute = require('./index')

const dir = process.cwd()
parseArgsAndExecute(dir, process.argv.slice(2))
