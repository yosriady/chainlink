/* eslint-disable @typescript-eslint/no-use-before-define */
// import fs from 'fs'
// import { join } from 'path'
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
// import cli from 'cli-ux'
// import chalk from 'chalk'
// import { ethers } from 'ethers'
// import { RuntimeConfigParser } from '../services/runtimeConfig'
// import { getNetworkName } from '../services/utils'

// const conf = new RuntimeConfigParser()

export default class Call extends Command {
  static description = 'Calls a chainlink smart contract function'

  static examples = [
    'belt call [<options>] <contract> <address> <sig> [<args>]',
    'belt call AccessControlledAggregator TODO',
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    // TODO: Add override flags for gas price, gas limit, nonce
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'contractName',
      description: 'Name of the chainlink contract',
    },
    {
      name: 'contractAddress',
      description: 'Address of the chainlink contract',
    },
    {
      name: 'functionSignature',
      description: 'ABI-encoded function signature to call',
    },
  ]

  async run() {
    const { args, argv } = this.parse(Call)

    await this.callContract(
      args.contractName,
      args.contractAddress,
      args.functionSignature,
      argv,
    )
  }

  private async callContract(
    contractName: string,
    contractAddress: string,
    functionSignature: string,
    argv: string[],
  ) {
    console.log(contractName)
    console.log(contractAddress)
    console.log(functionSignature)
    console.log(argv)
  }
}
