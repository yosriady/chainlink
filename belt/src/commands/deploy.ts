/* eslint-disable @typescript-eslint/no-use-before-define */
// import fs from 'fs'
// import { join } from 'path'
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
// import * as cli from 'inquirer'
// import chalk from 'chalk'

// const ETHERS_ARTIFACTS_DIR = 'ethers'

export default class Deploy extends Command {
  static description = 'Deploys a chainlink smart contract'

  static examples = [
    'belt deploy [<options>] <version> <contractName> [<args>]',
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    version: flags.string({
      char: 'v',
      description: 'Chainlink contract version',
    }),
    contract: flags.string({
      char: 'c',
      description: 'Chainlink contract name',
    }),
  }

  // TODO: figure out how to read ...rest args
  static args: Parser.args.IArg[] = [
    {
      name: 'TODO',
      description: 'TODO',
    },
  ]

  async run() {
    const { flags } = this.parse(Deploy)

    return this.handleNonInteractive(flags.version, flags.contract)
  }

  private handleNonInteractive(
    version: string | undefined,
    contractName: string | undefined,
  ) {
    // TODO: first is to check `ls ethers/` exists in cwd() from 'belt compile ethers
    // TODO: also check if .beltrc exists

    this.log(version)
    this.log(contractName)

    // const compilers = await import('../services/compilers')
  }
}
