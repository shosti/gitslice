// #!/usr/bin/env node

import 'module-alias/register'

import { config } from 'dotenv'

config()

import executeCommand from '@cmds/index'

try {
  executeCommand(process.cwd(), process.argv.slice(2))
} catch (error) {
  console.log(error)
  console.log(error.stack)
  process.exit(1)
}
