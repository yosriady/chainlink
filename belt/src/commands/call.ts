/* eslint-disable @typescript-eslint/no-use-before-define */
import fs from 'fs'
import { join } from 'path'
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import chalk from 'chalk'
// import cli from 'cli-ux'
import { ethers } from 'ethers'
import { getNetworkName } from '../services/utils'
import { RuntimeConfigParser } from '../services/runtimeConfig'

const conf = new RuntimeConfigParser()

export default class Call extends Command {
  static description = 'Calls a chainlink smart contract function'

  static examples = [
    'belt call [<options>] <contract> <address> <sig> [<args>]',
    'belt call AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD description()',
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
    // Check .beltrc exists
    if (!conf.exists()) {
      this.log(
        chalk.red(".beltrc not found - Run 'belt init -i' to get started."),
      )
      this.exit(1)
    }

    // Initialize ethers wallet (signer + provider)
    const options = conf.load()
    const provider = new ethers.providers.InfuraProvider(
      getNetworkName(options.chainId),
    )

    // Find contract ABI
    const cwd = process.cwd()
    const artifactPath = join(cwd, options.artifactsDir, `${contractName}.json`)
    if (!fs.existsSync(artifactPath)) {
      this.log(chalk.red(`ABI not found at ${artifactPath}`))
      this.exit(1)
    }

    // Load contract ABI
    const buffer = fs.readFileSync(artifactPath)
    const abi = JSON.parse(buffer.toString())

    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      provider,
    )

    // Validate constructor inputs
    // TODO: extract this logic
    // TODO: also, validate function signature has parens before this point
    const functionName = getFunctionName(functionSignature)
    const functionABI = getFunctionABI(abi, functionName)
    const numFunctionInputs = functionABI['inputs'].length
    const inputs = argv.slice(Object.keys(Call.args).length)
    if (numFunctionInputs !== inputs.length) {
      this.log(
        chalk.red(
          `Received ${inputs.length} arguments, ${functionSignature} expected ${numFunctionInputs}`,
        ),
      )
      this.exit(1)
    }

    // TODO: add overrides e.g. gasprice, gaslimit
    const result = await contract[functionSignature](...inputs)
    this.log(result)
  }
}

function getFunctionName(functionSignature: string) {
  return functionSignature.substr(0, functionSignature.indexOf('('))
}

function getFunctionABI(abi: any, functionName: string) {
  const functionABI = abi['compilerOutput']['abi'].find(
    (i: { type: string; name: string }) => {
      return i.type === 'function' && i.name === functionName
    },
  )
  return functionABI
}
