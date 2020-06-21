/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import chalk from 'chalk'
import { ethers } from 'ethers'
import {
  getNetworkName,
  findABI,
  parseArrayInputs,
  isValidSignature,
  getFunctionABI,
  getFunctionName,
} from '../services/utils'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'

const conf = new RuntimeConfigParser()

export interface CallOverrides {
  gasLimit?: number
  from?: string
}

export default class Call extends Command {
  static description = 'Calls a chainlink smart contract read-only function.'

  static examples = [
    'belt call [<options>] <version/contract> <address> <fsig> [<args>]',
    "belt call v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'description()'",
    "belt call v0.6/SimpleAccessControl 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'hasAccess(address,bytes)' 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD '0x'",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    from: flags.string({
      char: 'f',
      description: 'From address',
    }),
    gasLimit: flags.integer({
      char: 'l',
      description: 'Gas limit',
    }),
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'versionedContractName',
      description:
        'Version and name of the chainlink contract e.g. v0.6/FluxAggregator',
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
    const { args, argv, flags } = this.parse(Call)

    // Check .beltrc exists
    let config: RuntimeConfig
    try {
      config = conf.load()
    } catch (e) {
      this.error(chalk.red(e))
    }

    // Load call overrides
    const overrides: CallOverrides = {
      gasLimit: flags.gasLimit || config.gasLimit,
      ...(flags.from && { from: flags.from }),
    }

    // Initialize ethers provider
    const provider = new ethers.providers.InfuraProvider(
      getNetworkName(config.chainId),
      { projectId: config.infuraProjectId },
    )

    await this.callContract(
      provider,
      args.versionedContractName,
      args.contractAddress,
      args.functionSignature,
      argv,
      overrides,
    )
  }

  private async callContract(
    provider: ethers.providers.InfuraProvider,
    versionedContractName: string,
    contractAddress: string,
    functionSignature: string,
    argv: string[],
    overrides: CallOverrides,
  ) {
    // Find contract ABI
    const { found, abi } = findABI(versionedContractName)
    if (!found) {
      this.error(
        chalk.red(
          `${versionedContractName} ABI not found - Run 'belt compile'`,
        ),
      )
    }

    // Validate function signature
    if (!isValidSignature(functionSignature)) {
      this.error(
        chalk.red(
          "Invalid function signature - Example: belt call ... 'hasAccess(address,bytes)'",
        ),
      )
    }
    const functionName = getFunctionName(functionSignature)
    const functionABI = getFunctionABI(abi, functionName)
    if (!functionABI) {
      this.error(
        chalk.red(
          `function ${functionSignature} not found in ${versionedContractName}`,
        ),
      )
    }

    // Validate command inputs against function inputs
    const numFunctionInputs = functionABI['inputs'].length
    const commandInputs = argv.slice(Object.keys(Call.args).length)
    if (numFunctionInputs !== commandInputs.length) {
      this.error(
        chalk.red(
          `Received ${commandInputs.length} arguments, ${functionSignature} expected ${numFunctionInputs}`,
        ),
      )
    }

    // Transforms string arrays to arrays
    const parsedInputs = parseArrayInputs(commandInputs)

    // Initialize contract
    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      provider,
    )

    // Call contract
    try {
      const result = await contract[functionSignature](
        ...parsedInputs,
        overrides,
      )
      this.log(result)
    } catch (e) {
      this.error(chalk.red(e))
    }
  }
}
