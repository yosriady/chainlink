/* eslint-disable @typescript-eslint/no-use-before-define */
import fs from 'fs'
import { join } from 'path'
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import chalk from 'chalk'
import { RuntimeConfigParser } from '../services/runtimeConfig'

// const ETHERS_ARTIFACTS_DIR = 'ethers'
const conf = new RuntimeConfigParser()

export default class Deploy extends Command {
  static description = 'Deploys a chainlink smart contract'

  static examples = ['belt deploy [<options>] <contractName> [<args>]']
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    // TODO: override flags for gas price, gas limit
  }

  // TODO: figure out how to read ...rest args
  static args: Parser.args.IArg[] = [
    {
      name: 'contractName',
      description: 'Name of the chainlink contract to deploy',
    },
  ]

  async run() {
    const { args, argv } = this.parse(Deploy)

    await this.handleNonInteractive(args, argv)

    return
  }

  private async handleNonInteractive(
    args: { [x: string]: any; contractName?: any },
    argv: string[],
  ) {
    if (!conf.exists()) {
      this.log(
        chalk.red(".beltrc not found - Run 'belt init -i' to get started."),
      )
      this.exit(1)
    }

    const options = conf.load()
    console.log(options)
    console.log(args)
    console.log(argv)

    const cwd = process.cwd()
    const artifactPath = join(
      cwd,
      options.artifactsDir,
      `${args.contractName}.json`,
    )
    console.log(artifactPath)
    if (!fs.existsSync(artifactPath)) {
      this.log(chalk.red(`ABI not found at ${artifactPath}`))
      this.exit(1)
    }

    const buffer = fs.readFileSync(artifactPath)
    const abi = JSON.parse(buffer.toString())
    console.log('ABI loaded')
    console.log(abi)

    // TODO: After deployment, return contractAddress to stdout for piping
  }
}
